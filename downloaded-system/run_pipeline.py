#!/usr/bin/env python3
import os, sys, subprocess

def main():
    # 確保以專案根目錄為基準
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    os.chdir(project_root)

    print("🚀 [1/2] 啟動全量 ETL 資料清洗 (full_etl_all_reports.py)...")
    etl_script = os.path.join("downloaded-system", "full_etl_all_reports.py")
    res = subprocess.run([sys.executable, etl_script])
    if res.returncode != 0:
        print("\n❌ ETL 清洗失敗，停止後續驗證。")
        sys.exit(res.returncode)

    print("\n🔍 [2/2] 啟動資料庫與日期格式完整性驗證 (verify_database.py)...")
    verify_script = os.path.join("downloaded-system", "verify_database.py")
    res_verify = subprocess.run([sys.executable, verify_script])
    if res_verify.returncode != 0:
        print("\n⚠️ 驗證時發現部分格式未完全符合標準，請檢視上方輸出。")
        sys.exit(res_verify.returncode)

    print("\n✨ 全部清洗與驗證流程皆已無腦一步到位完成！")

if __name__ == "__main__":
    main()
