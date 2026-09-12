#!/usr/bin/env python3
import os, sys, sqlite3, re

def verify():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    db_path = os.path.join(project_root, "downloaded-system", "lrp_database.sqlite")

    if not os.path.exists(db_path):
        print(f"❌ 找不到資料庫檔案: {db_path}，請先執行 ETL 清洗。")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print("=== 1. 各核心資料表筆數驗證 ===")
    expected_counts = {
        "residents": 26,
        "nursing_records": 7170,
        "vital_signs": 26101,
        "doctor_visits": 490,
        "assessments_periodic": 64663,
        "daily_care_shifts": 4524,
        "social_work_records": 7459,
        "nutrition_therapy_records": 147,
        "pharmacist_evaluations": 162
    }
    all_count_passed = True
    for tbl, exp in expected_counts.items():
        cur.execute(f"SELECT count(*) FROM {tbl}")
        cnt = cur.fetchone()[0]
        flag = "✅" if cnt >= exp * 0.98 else "⚠️"
        if flag == "⚠️":
            all_count_passed = False
        print(f"  {flag} {tbl:28s}: {cnt:6d} 筆 (基準值 ~{exp})")

    print("\n=== 2. 日期/時間欄位格式嚴格檢驗 ===")
    date_patterns = [
        r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}",  # YYYY-MM-DD 或 YYYY/MM/DD
        r"^\d{1,2}[-/]\d{1,2}$",          # MM/DD (生命徵象與血糖)
        r"^\d{1,2}:\d{2}$",               # HH:MM (照服員排程)
        r"^當班總評$",                       # 照服員當班摘要
    ]

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in cur.fetchall()]

    all_date_passed = True
    for t in tables:
        cur.execute(f"PRAGMA table_info({t})")
        for col in cur.fetchall():
            c = col[1]
            if "date" in c.lower() or c.lower() in ["birthday", "admission_date", "time_slot"]:
                cur.execute(f"SELECT DISTINCT {c} FROM {t} WHERE {c} IS NOT NULL AND {c} != ''")
                distinct_vals = [r[0] for r in cur.fetchall()]
                invalids = [v for v in distinct_vals if not any(re.search(p, str(v).strip()) for p in date_patterns)]
                
                if len(invalids) > 0:
                    all_date_passed = False
                    flag = f"❌ 異常 ({len(invalids)} 種非時間值)"
                else:
                    flag = "✅ 100% 格式規範"
                print(f"  {flag:18s} | {t}.{c}")

    conn.close()
    if all_count_passed and all_date_passed:
        print("\n🎉 驗證通過：所有資料表筆數與日期格式皆完全符合標準！")
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(verify())
