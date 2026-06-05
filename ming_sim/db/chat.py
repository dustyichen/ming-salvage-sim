"""chat_messages：召对对话存档（持久化，进程重启恢复内存缓存）。

_ChatMixin。原撤回机制（chat_turns / chat_turn_rollback_items + agno runs 裁剪）已废——
召对流式中途退出＝前端中断线程，整轮不落库（副作用循环在流式跑完后才执行，中断即无副作用），
故无需事后回滚。只保留对话消息存档。
"""

from __future__ import annotations

from typing import Dict, List


class _ChatMixin:
    def append_chat_message(self, minister_name: str, turn: int, role: str, content: str) -> int:
        """召对聊天单条消息落库（chat_messages）。"""
        cur = self.conn.execute(
            "INSERT INTO chat_messages (minister_name, turn, role, content) VALUES (?, ?, ?, ?)",
            (minister_name, turn, role, content),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def load_all_chat_history(self) -> Dict[str, List[Dict[str, str]]]:
        """读出全部召对记录，按大臣分组，供进程启动时恢复内存缓存。"""
        rows = self.conn.execute(
            "SELECT minister_name, role, content FROM chat_messages ORDER BY id"
        ).fetchall()
        history: Dict[str, List[Dict[str, str]]] = {}
        for row in rows:
            history.setdefault(row["minister_name"], []).append(
                {"role": row["role"], "content": row["content"]}
            )
        return history
