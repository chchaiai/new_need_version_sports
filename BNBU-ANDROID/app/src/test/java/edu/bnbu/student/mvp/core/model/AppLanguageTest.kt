package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class AppLanguageTest {
    @Test
    fun `defaults to Chinese for a new installation regardless of system language`() {
        assertEquals(AppLanguage.Chinese, AppLanguage.fromStorage(null))
    }

    @Test
    fun `reads a saved English preference`() {
        assertEquals(AppLanguage.English, AppLanguage.fromStorage("en"))
    }

    @Test
    fun `accepts historical BCP-47 values from local or server preferences`() {
        assertEquals(AppLanguage.Chinese, AppLanguage.fromStorage("zh-CN"))
        assertEquals(AppLanguage.Chinese, AppLanguage.fromStorage("zh_Hans_CN"))
        assertEquals(AppLanguage.English, AppLanguage.fromStorage("en-US"))
    }
}
