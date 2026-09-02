package edu.bnbu.student.mvp.core.local

enum class LocalStoreReadStatus(val label: String) {
    Missing("未保存"),
    Loaded("已读取"),
    DecodeFailed("解码失败"),
    Discarded("已丢弃")
}

enum class LocalStoreWriteStatus(val label: String) {
    Idle("未写入"),
    Saved("写入成功"),
    Failed("写入失败"),
    Cleared("已清理")
}

data class LocalStoreReadResult<T>(
    val value: T?,
    val status: LocalStoreReadStatus
)

data class LocalStoreHealth(
    val workspaceReadStatus: LocalStoreReadStatus,
    val draftReadStatus: LocalStoreReadStatus,
    val lastWriteStatus: LocalStoreWriteStatus,
    val lastEvent: String
) {
    companion object {
        val Fresh = LocalStoreHealth(
            workspaceReadStatus = LocalStoreReadStatus.Missing,
            draftReadStatus = LocalStoreReadStatus.Missing,
            lastWriteStatus = LocalStoreWriteStatus.Idle,
            lastEvent = "尚未读取本地数据"
        )
    }
}
