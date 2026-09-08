package edu.bnbu.student.contractvalidation.mock

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

/** Isolated student verification screen; all content comes from the tested HTTP/DTO/Mapper chain. */
@Composable
fun ContractMockScreen(page: ValidationPage, onAction: (PageAction) -> Unit) {
    MaterialTheme {
        Surface {
            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)
                .verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("MOCK · 合成数据验证", Modifier.testTag("mock.marker"), style = MaterialTheme.typography.labelLarge)
                Text(page.title, Modifier.testTag("page.title"), style = MaterialTheme.typography.headlineSmall)
                Text(page.state.name, Modifier.testTag("page.state"))
                if (page.readOnly) Text("只读状态", Modifier.testTag("page.readOnly"))
                if (page.state == PageState.LOADING) CircularProgressIndicator(Modifier.testTag("page.loading"))
                if (page.state == PageState.EMPTY) Text("暂无记录", Modifier.testTag("page.empty"))
                page.rows.forEach { row ->
                    Column {
                        Text(row.label, style = MaterialTheme.typography.labelMedium)
                        Text(row.value, Modifier.testTag(row.key))
                    }
                }
                page.problem?.let { Text(it, Modifier.testTag("page.problem")) }
                page.actions.forEach { action ->
                    Button(onClick = { onAction(action) }, modifier = Modifier.testTag("action.${action.name}")) {
                        Text(when (action) {
                            PageAction.RETRY -> "重新加载"
                            PageAction.SIGN_IN -> "邮箱验证码登录"
                            PageAction.FIRST_MATERIAL -> "提交首次材料"
                            PageAction.CONTINUE_BATCH -> "继续原批次上传"
                            PageAction.SUPPLEMENT -> "提交补充材料"
                            PageAction.REGISTER -> "开始入班"
                        })
                    }
                }
            }
        }
    }
}
