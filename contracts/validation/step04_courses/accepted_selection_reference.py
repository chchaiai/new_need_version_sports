from collections import Counter, defaultdict
from datetime import timedelta

def eligible_minutes(active_seconds, threshold):
    whole = active_seconds // 60
    return 0 if whole < threshold else min(whole, 60)

def business_week(day):
    return day - timedelta(days=day.weekday())

def select_credit(candidates, targets, certification, threshold, weekly_limit,
                  previous_ids=()):
    # candidates 只接收 P4-H「B-有效候选结果」；此处不判定审核有效性。
    # started_at 是可比较的服务端 instant，day 是固化的上海业务日期。
    assert threshold in (30, 45, 60) and weekly_limit in (2, 3, 4)
    assert len(targets) == len(certification) == 2
    assert all(isinstance(t, int) and t >= 0 for t in targets)
    assert sum(targets) == 1200 and all(c >= 0 for c in certification)
    assert len({r["id"] for r in candidates}) == len(candidates)
    base = tuple(min(targets[c], certification[c]) for c in (0, 1))
    room = tuple(targets[c] - base[c] for c in (0, 1))
    rows = sorted(
        [dict(r, q=eligible_minutes(r["active_seconds"], threshold))
         for r in candidates],
        key=lambda r: (r["started_at"], r["id"]))
    positive = [r for r in rows if r["q"] > 0]
    by_id = {r["id"]: r for r in positive}
    bit = {r["id"]: 1 << (len(positive) - 1 - i)
           for i, r in enumerate(positive)}
    by_day = defaultdict(list)
    for r in positive:
        by_day[r["day"]].append(r)

    # key=(本周已选条数, 两类已分配运动分钟); value=(平局位序, 见证ID元组)
    dp = {(0, 0, 0): (0, ())}
    last_week = None

    def keep(table, key, witness):
        if key not in table or witness[0] > table[key][0]:
            table[key] = witness

    for day in sorted(by_day):
        week = business_week(day)
        if week != last_week:
            reset = {}
            for (_, x, y), witness in dp.items():
                keep(reset, (0, x, y), witness)
            dp, last_week = reset, week
        nxt = {}
        for (k, x, y), (mask, ids) in dp.items():
            keep(nxt, (k, x, y), (mask, ids))  # 当天不选
            if k == weekly_limit:
                continue
            for r in by_day[day]:            # 当天至多选一条
                amounts = [x, y]
                c = r["category"]            # 0=课程相关，1=其他
                amounts[c] = min(room[c], amounts[c] + r["q"])
                if amounts == [x, y]:
                    continue                # 实际贡献0，不占计入名额
                key = (k + 1, amounts[0], amounts[1])
                keep(nxt, key, (mask | bit[r["id"]], ids + (r["id"],)))
        dp = nxt

    (best_key, best_witness) = max(
        dp.items(), key=lambda item: (item[0][1] + item[0][2], item[1][0]))
    optimum = sum(base) + best_key[1] + best_key[2]
    chosen = best_witness[1]

    def allocate(ids):
        remaining = list(room)
        actual = {}
        for r in sorted((by_id[i] for i in ids),
                        key=lambda r: (r["started_at"], r["id"])):
            c = r["category"]
            actual[r["id"]] = min(r["q"], remaining[c])
            remaining[c] -= actual[r["id"]]
        totals = tuple(targets[c] - remaining[c] for c in (0, 1))
        return actual, totals

    # “保留原组合”按完整集合判断，不自行增加“尽量保留交集”规则。
    old = tuple(previous_ids)
    if len(set(old)) == len(old) and all(i in by_id for i in old):
        old_rows = [by_id[i] for i in old]
        unique_days = len({r["day"] for r in old_rows}) == len(old_rows)
        counts = Counter(business_week(r["day"]) for r in old_rows)
        if unique_days and all(n <= weekly_limit for n in counts.values()):
            old_actual, old_totals = allocate(old)
            if all(v > 0 for v in old_actual.values()) and sum(old_totals) == optimum:
                chosen = tuple(r["id"] for r in sorted(
                    old_rows, key=lambda r: (r["started_at"], r["id"])))
    actual, totals = allocate(chosen)
    assert sum(totals) == optimum
    return {
        "selected_ids": chosen,
        "certification_counted": base,
        "category_totals": totals,
        "total": optimum,
        "record_actual": {r["id"]: actual.get(r["id"], 0) for r in rows},
    }
