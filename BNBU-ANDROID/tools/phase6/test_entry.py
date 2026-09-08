"""Negative controls for the actual entry gates; mutates only disposable temp copies."""
import json
from pathlib import Path
import tempfile
import unittest

from contract_entry import check_generator, check_identity, model_hashes, require_same_models


class BindingControls(unittest.TestCase):
    def setUp(self):
        self.repo = Path(__file__).resolve().parents[3]
        self.lock = json.loads((self.repo / 'BNBU-ANDROID/contract-validation/contract-lock.json').read_text('utf-8'))
        self.temp = tempfile.TemporaryDirectory(prefix='bnbu-phase6-negative-')
        self.addCleanup(self.temp.cleanup)
        self.spec = Path(self.temp.name) / 'openapi.yaml'
        self.meta = Path(self.temp.name) / 'metadata.json'
        self.spec.write_bytes((self.repo / 'contracts/openapi.yaml').read_bytes())
        self.meta.write_bytes((self.repo / 'contracts/contract-metadata.json').read_bytes())

    def test_published_identity_is_accepted(self):
        check_identity(self.spec, self.meta, self.lock)

    def test_even_whitespace_change_fails_raw_sha_gate(self):
        self.spec.write_bytes(self.spec.read_bytes() + b'\n')
        with self.assertRaisesRegex(ValueError, 'raw SHA-256 mismatch'):
            check_identity(self.spec, self.meta, self.lock)

    def test_crlf_conversion_fails_raw_sha_gate(self):
        self.spec.write_bytes(self.spec.read_bytes().replace(b'\n', b'\r\n'))
        with self.assertRaisesRegex(ValueError, 'raw SHA-256 mismatch'):
            check_identity(self.spec, self.meta, self.lock)

    def test_wrong_version_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Version mismatch'):
            check_identity(self.spec, self.meta, {**self.lock, 'version': '1.2.0-contract'})

    def test_wrong_status_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Status mismatch'):
            check_identity(self.spec, self.meta, {**self.lock, 'status': 'DRAFT'})

    def test_stale_metadata_is_rejected(self):
        data = json.loads(self.meta.read_text('utf-8'))
        data['openapiSha256'] = '0' * 64
        self.meta.write_text(json.dumps(data), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Metadata identity mismatch'):
            check_identity(self.spec, self.meta, self.lock)

    def test_changed_model_bytes_are_rejected(self):
        model = Path(self.temp.name) / 'ActualModel.kt'
        model.write_text('data class ActualModel(val id: String)\n', encoding='utf-8')
        original = model_hashes(model.parent)
        model.write_text('data class ActualModel(val id: String?)\n', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'generation differs'):
            require_same_models(original, model_hashes(model.parent))

    def test_missing_model_is_rejected(self):
        model = Path(self.temp.name) / 'ActualModel.kt'
        model.write_text('data class ActualModel(val id: String)\n', encoding='utf-8')
        original = model_hashes(model.parent)
        empty = model.parent / 'empty-generation'
        empty.mkdir()
        with self.assertRaisesRegex(ValueError, 'generation differs'):
            require_same_models(original, model_hashes(empty))

    def test_wrong_generator_is_rejected_before_execution(self):
        wrong = Path(self.temp.name) / 'wrong-generator.jar'
        wrong.write_bytes(b'not the published generator')
        with self.assertRaisesRegex(ValueError, 'Generator jar SHA-256 mismatch'):
            check_generator(wrong, self.repo / 'contracts/validation/step06_final/template-manifest.json')


if __name__ == '__main__':
    unittest.main(verbosity=2)
