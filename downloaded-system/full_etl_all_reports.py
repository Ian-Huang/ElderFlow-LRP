import os, sys, json, sqlite3, re, html
from datetime import datetime
from bs4 import BeautifulSoup

def clean_text(text):
    if text is None:
        return ""
    text = str(text).strip()
    text = re.sub(r"\s+", " ", text)
    return text

def parse_medications_html(html_str):
    if not html_str:
        return []
    raw = html.unescape(html_str)
    if "<table" not in raw:
        return []
    soup = BeautifulSoup(raw, "html.parser")
    meds = []
    for tr in soup.find_all("tr"):
        tds = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(tds) >= 4 and tds[0] != "藥物":
            meds.append({
                "name": tds[0],
                "dose": tds[1],
                "freq": tds[2],
                "route": tds[3]
            })
    return meds

def run_full_etl():
    src_path = "downloaded-system/full_online_backup_complete.json"
    nursing_supp_path = "downloaded-system/nursing_records_supplement.json"
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found!")
        return

    print("讀取 51MB 原始全量備份檔案中...")
    with open(src_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    # 讀取補充護理記錄
    nursing_supp_data = {}
    if os.path.exists(nursing_supp_path):
        print(f"讀取 {nursing_supp_path} 護理記錄補齊包中...")
        with open(nursing_supp_path, "r", encoding="utf-8") as f:
            nursing_supp_data = json.load(f)

    out_dir = "downloaded-system/normalized"
    os.makedirs(out_dir, exist_ok=True)
    sqlite_path = "downloaded-system/lrp_database.sqlite"

    conn = sqlite3.connect(sqlite_path)
    cur = conn.cursor()

    # Drop and recreate 20 tables (added nursing_records)
    cur.executescript("""
    DROP TABLE IF EXISTS residents;
    DROP TABLE IF EXISTS vital_signs;
    DROP TABLE IF EXISTS nursing_records;
    DROP TABLE IF EXISTS doctor_visits;
    DROP TABLE IF EXISTS blood_sugar;
    DROP TABLE IF EXISTS insulin_injections;
    DROP TABLE IF EXISTS tube_records;
    DROP TABLE IF EXISTS weight_history;
    DROP TABLE IF EXISTS assessments_periodic;
    DROP TABLE IF EXISTS comprehensive_assessments;
    DROP TABLE IF EXISTS physical_evaluations;
    DROP TABLE IF EXISTS daily_care_shifts;
    DROP TABLE IF EXISTS social_work_records;
    DROP TABLE IF EXISTS pharmacist_evaluations;
    DROP TABLE IF EXISTS interdisciplinary_plans;
    DROP TABLE IF EXISTS rehab_evaluations;
    DROP TABLE IF EXISTS professional_referrals;
    DROP TABLE IF EXISTS lab_test_records;
    DROP TABLE IF EXISTS nutrition_therapy_records;
    DROP TABLE IF EXISTS rehab_exercise_logs;

    CREATE TABLE residents (
        id INTEGER PRIMARY KEY,
        bed_name TEXT,
        name TEXT,
        gender TEXT,
        age INTEGER,
        birthday TEXT,
        admission_date TEXT,
        id_card TEXT,
        patient_id TEXT,
        height_cm REAL,
        weight_kg REAL,
        past_history TEXT,
        allergies TEXT,
        tubes TEXT,
        primary_diagnosis TEXT,
        secondary_diagnosis TEXT,
        diagnoses TEXT,
        medications_json TEXT
    );

    CREATE TABLE vital_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        measured_date TEXT,
        measured_time TEXT,
        temperature REAL,
        pulse INTEGER,
        respiration INTEGER,
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        blood_pressure TEXT,
        spo2 INTEGER,
        pain_score TEXT,
        blood_sugar TEXT,
        stool TEXT,
        recorder TEXT
    );

    CREATE TABLE nursing_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        event_date TEXT,
        record_flag INTEGER,
        focus TEXT,
        content TEXT,
        recorder TEXT,
        task_id TEXT,
        form_id TEXT
    );

    CREATE TABLE doctor_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        visit_date TEXT,
        doctor_name TEXT,
        subjective TEXT,
        objective TEXT
    );

    CREATE TABLE blood_sugar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        record_date TEXT,
        period TEXT,
        sugar_value REAL,
        recorder TEXT
    );

    CREATE TABLE insulin_injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        record_date TEXT,
        sugar_ac TEXT,
        sugar_pc TEXT,
        injection_site TEXT,
        frequency TEXT,
        drug_name TEXT,
        dose TEXT,
        recorder TEXT
    );

    CREATE TABLE tube_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        record_date TEXT,
        tube_name TEXT,
        tube_spec TEXT,
        situation TEXT,
        recorder TEXT
    );

    CREATE TABLE weight_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        record_date TEXT,
        height_cm REAL,
        weight_kg REAL,
        recorder TEXT
    );

    CREATE TABLE assessments_periodic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        assessment_type TEXT,
        item_name TEXT,
        record_date TEXT,
        value_or_score TEXT
    );

    CREATE TABLE comprehensive_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        category TEXT,
        item_title TEXT,
        evaluation_content TEXT
    );

    CREATE TABLE physical_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        category TEXT,
        item_title TEXT,
        evaluation_content TEXT
    );

    CREATE TABLE daily_care_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        shift TEXT,
        item_name TEXT,
        time_slot TEXT,
        content_json TEXT
    );

    CREATE TABLE social_work_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        form_type TEXT,
        record_date TEXT,
        record_title TEXT,
        record_content TEXT
    );

    CREATE TABLE pharmacist_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        eval_date TEXT,
        item_title TEXT,
        eval_content TEXT
    );

    CREATE TABLE interdisciplinary_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        plan_section TEXT,
        plan_content TEXT
    );

    CREATE TABLE rehab_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        eval_date TEXT,
        section TEXT,
        item_title TEXT,
        eval_content TEXT
    );

    CREATE TABLE professional_referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        referral_date TEXT,
        department TEXT,
        problem_statement TEXT,
        response TEXT,
        followup TEXT
    );

    CREATE TABLE lab_test_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        test_date TEXT,
        category TEXT,
        item_name TEXT,
        test_value TEXT,
        unit TEXT,
        reference_range TEXT
    );

    CREATE TABLE nutrition_therapy_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        eval_date TEXT,
        eval_reason TEXT,
        assessment_content TEXT
    );

    CREATE TABLE rehab_exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER,
        resident_name TEXT,
        bed_name TEXT,
        log_date TEXT,
        item_name TEXT,
        completion_rate TEXT,
        recorder TEXT
    );

    CREATE INDEX idx_vs_res ON vital_signs(resident_id, measured_date);
    CREATE INDEX idx_nur_res ON nursing_records(resident_id, event_date);
    CREATE INDEX idx_doc_res ON doctor_visits(resident_id, visit_date);
    CREATE INDEX idx_inph_res ON insulin_injections(resident_id, record_date);
    CREATE INDEX idx_ass_res ON assessments_periodic(resident_id, assessment_type);
    CREATE INDEX idx_rehab_res ON rehab_evaluations(resident_id, eval_date);
    CREATE INDEX idx_ref_res ON professional_referrals(resident_id, referral_date);
    CREATE INDEX idx_lab_res ON lab_test_records(resident_id, test_date);
    """)

    # Output storage
    residents_list = []
    vital_signs_list = []
    nursing_records_list = []
    doctor_visits_list = []
    blood_sugar_list = []
    insulin_list = []
    tube_records_list = []
    weight_history_list = []
    assessments_list = []
    comprehensive_list = []
    physical_list = []
    daily_care_shifts_list = []
    social_work_list = []
    pharmacist_list = []
    plans_list = []
    rehab_eval_list = []
    referrals_list = []
    lab_tests_list = []
    nutrition_list = []
    rehab_exercise_list = []
    resident_reports_map = {}

    print("開始執行全機構 26 位長輩、63 類表單（含全量護理紀錄）之深度 ETL 洗淨...")

    for r_entry in raw_data.get("residents", []):
        r_info = r_entry.get("residentInfo", {})
        rid = r_info.get("ID")
        rname = clean_text(r_info.get("Name"))
        bed = clean_text(r_info.get("BedName"))
        pid = clean_text(r_info.get("PatientID"))
        reports = r_entry.get("reports", {})

        gender = ""
        age = None
        birthday = ""
        admission_date = ""
        id_card = ""
        height_cm = None
        weight_kg = None
        past_history = ""
        allergies = ""
        tubes = ""
        primary_diag = ""
        secondary_diag = ""
        diagnoses = ""
        meds_list = []

        # 1. 醫師巡診紀錄單 (IDPat)
        # Structure: blocks of ~31 rows, each block starts with row[0]=="姓名"
        # Visit date is in the "TPR" row's HTML: first YYYY-MM-DD HH:MM:SS inside <td>
        doc_rep = reports.get("醫師巡診紀錄單", reports.get("醫師巡診紀錄", {}))
        doc_table = doc_rep.get("table", [])
        if doc_table:
            curr_doc = ""
            curr_date = ""
            for row in doc_table:
                row_str = " ".join(row)
                # New visit block: reset date and doctor when we see row[0]=="姓名"
                if len(row) >= 2 and row[0] == "姓名":
                    curr_date = ""
                    curr_doc = ""
                if "身分證號" in row_str:
                    m_id = re.search(r"身分證號\s*([A-Z0-9]+)", row_str)
                    if m_id: id_card = m_id.group(1)
                    m_adm = re.search(r"於\s*(\d{4}/\d{2}/\d{2})\s*入住", row_str)
                    if m_adm: admission_date = m_adm.group(1)
                if "出生日" in row_str:
                    m_b = re.search(r"(\d{4}/\d{2}/\d{2})", row_str)
                    if m_b: birthday = m_b.group(1)
                    m_age = re.search(r"\(\s*(\d+)\s*\)", row_str)
                    if m_age: age = int(m_age.group(1))
                if "身高" in row_str:
                    m_h = re.search(r"(\d+(?:\.\d+)?)\s*cm", row_str)
                    if m_h: height_cm = float(m_h.group(1))
                if len(row) >= 2 and row[0] == "過去病史":
                    past_history = clean_text(row[1])
                if len(row) >= 4 and "藥物過敏" in row[2]:
                    allergies = clean_text(row[3])
                if len(row) >= 6 and "使用管路" in row[4]:
                    tubes = clean_text(row[5])
                if len(row) >= 2 and row[0] == "目前用藥" and not meds_list:
                    meds_list = parse_medications_html(row[1])
                # Extract visit date from TPR HTML (first YYYY-MM-DD HH:MM:SS in table)
                if len(row) >= 2 and row[0] == "TPR" and not curr_date:
                    raw_tpr = html.unescape(str(row[1]))
                    m_tpr_dt = re.search(r"(\d{4}-\d{2}-\d{2})\s*\d{2}:\d{2}:\d{2}", raw_tpr)
                    if m_tpr_dt:
                        curr_date = m_tpr_dt.group(1).replace("-", "/")
                if len(row) >= 2 and row[0] == "巡診醫師":
                    curr_doc = clean_text(row[1])
                if len(row) >= 2 and row[0] == "Subjective":
                    curr_subj = clean_text(row[1])
                    d_item = {
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "visit_date": curr_date,
                        "doctor_name": curr_doc,
                        "subjective": curr_subj,
                        "objective": ""
                    }
                    doctor_visits_list.append(d_item)
                    cur.execute("""
                    INSERT INTO doctor_visits (resident_id, resident_name, bed_name, visit_date, doctor_name, subjective, objective)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (rid, rname, bed, curr_date, curr_doc, curr_subj, ""))

        # 2. 全人評估 (IN100)
        n100_rep = reports.get("全人評估", {})
        n100_table = n100_rep.get("table", [])
        curr_cat = "全人評估"
        for row in n100_table:
            row_str = " ".join(row)
            if "主要診斷：" in row_str:
                m_pd = re.search(r"主要診斷：([^\n]+)", row_str)
                if m_pd: primary_diag = clean_text(m_pd.group(1))
                m_sd = re.search(r"次要診斷：([^\n]+)", row_str)
                if m_sd: secondary_diag = clean_text(m_sd.group(1))
            if len(row) == 1:
                curr_cat = clean_text(row[0])
            elif len(row) >= 2:
                title = clean_text(row[0])
                val = clean_text(" | ".join(row[1:]))
                if title and val and title != "全人評估":
                    comprehensive_list.append({
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "category": curr_cat,
                        "item_title": title,
                        "evaluation_content": val
                    })
                    cur.execute("""
                    INSERT INTO comprehensive_assessments (resident_id, resident_name, bed_name, category, item_title, evaluation_content)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (rid, rname, bed, curr_cat, title, val))

        # 3. 身體評估 (IOc07)
        phy_rep = reports.get("身體評估", {})
        phy_table = phy_rep.get("table", [])
        curr_phy_cat = "身體評估"
        for row in phy_table:
            if len(row) == 1:
                curr_phy_cat = clean_text(row[0])
            elif len(row) >= 2:
                title = clean_text(row[0])
                val = clean_text(" | ".join(row[1:]))
                if title and val and title != "身體評估":
                    physical_list.append({
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "category": curr_phy_cat,
                        "item_title": title,
                        "evaluation_content": val
                    })
                    cur.execute("""
                    INSERT INTO physical_evaluations (resident_id, resident_name, bed_name, category, item_title, evaluation_content)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (rid, rname, bed, curr_phy_cat, title, val))

        # 4. 身高體重記錄單 (IHWei)
        weight_rep = reports.get("身高體重記錄單", reports.get("身高體重", {}))
        w_table = weight_rep.get("table", [])
        for row in w_table:
            if len(row) >= 3 and re.search(r"\d{4}/\d{2}/\d{2}", str(row[0])):
                w_date = clean_text(row[0])
                w_h = float(row[1]) if re.match(r"^\d+(\.\d+)?$", clean_text(row[1])) else None
                w_w = float(row[2]) if re.match(r"^\d+(\.\d+)?$", clean_text(row[2])) else None
                w_rec = clean_text(row[3]) if len(row) > 3 else ""
                if w_w and not weight_kg: weight_kg = w_w
                if w_h and not height_cm: height_cm = w_h
                weight_history_list.append({
                    "resident_id": rid,
                    "resident_name": rname,
                    "bed_name": bed,
                    "record_date": w_date,
                    "height_cm": w_h,
                    "weight_kg": w_w,
                    "recorder": w_rec
                })
                cur.execute("""
                INSERT INTO weight_history (resident_id, resident_name, bed_name, record_date, height_cm, weight_kg, recorder)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (rid, rname, bed, w_date, w_h, w_w, w_rec))

        # 5. 整合照護計畫 (diagnoses)
        plan_rep = reports.get("整合照護計畫", {})
        p_table = plan_rep.get("table", [])
        if p_table:
            for prow in p_table:
                if len(prow) >= 5 and prow[0] == "姓名" and "疾病診斷" in prow[4]:
                    diagnoses = clean_text(prow[5] if len(prow) > 5 else "")
                if len(prow) >= 2:
                    plans_list.append({
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "plan_section": clean_text(prow[0]),
                        "plan_content": clean_text(" | ".join(prow[1:]))
                    })
                    cur.execute("""
                    INSERT INTO interdisciplinary_plans (resident_id, resident_name, bed_name, plan_section, plan_content)
                    VALUES (?, ?, ?, ?, ?)
                    """, (rid, rname, bed, clean_text(prow[0]), clean_text(" | ".join(prow[1:]))))

        # Fallback gender & age from report headers
        if not gender or not age:
            for rrep in reports.values():
                tbl = rrep.get("table", [])
                if tbl and len(tbl) > 0:
                    hdr_str = " ".join(tbl[0])
                    m_g = re.search(r"性別：(男|女)", hdr_str)
                    if m_g and not gender: gender = m_g.group(1)
                    m_a = re.search(r"年齡：(\d+)", hdr_str)
                    if m_a and not age: age = int(m_a.group(1))

        res_record = {
            "id": rid,
            "bed_name": bed,
            "name": rname,
            "gender": gender,
            "age": age,
            "birthday": birthday,
            "admission_date": admission_date,
            "id_card": id_card,
            "patient_id": pid,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "past_history": past_history,
            "allergies": allergies,
            "tubes": tubes,
            "primary_diagnosis": primary_diag,
            "secondary_diagnosis": secondary_diag,
            "diagnoses": diagnoses,
            "medications": meds_list
        }
        residents_list.append(res_record)

        cur.execute("""
        INSERT INTO residents (id, bed_name, name, gender, age, birthday, admission_date, id_card, patient_id, height_cm, weight_kg, past_history, allergies, tubes, primary_diagnosis, secondary_diagnosis, diagnoses, medications_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (rid, bed, rname, gender, age, birthday, admission_date, id_card, pid, height_cm, weight_kg, past_history, allergies, tubes, primary_diag, secondary_diag, diagnoses, json.dumps(meds_list, ensure_ascii=False)))

        # 6. 生命徵象量表 (IVitl)
        vs_rep = reports.get("生命徵象量表", reports.get("生命徵象", {}))
        for row in vs_rep.get("table", []):
            if len(row) >= 4 and re.search(r"^\d{1,2}/\d{1,2}$", str(row[0])):
                date = clean_text(row[0])
                time = clean_text(row[1]) if len(row) > 1 else ""
                temp_str = clean_text(row[2]) if len(row) > 2 else ""
                pulse_str = clean_text(row[3]) if len(row) > 3 else ""
                resp_str = clean_text(row[4]) if len(row) > 4 else ""
                bp_str = clean_text(row[5]) if len(row) > 5 else ""
                spo2_str = clean_text(row[6]) if len(row) > 6 else ""
                pain_str = clean_text(row[7]) if len(row) > 7 else ""
                bs_str = clean_text(row[8]) if len(row) > 8 else ""
                stool_str = clean_text(row[9]) if len(row) > 9 else ""
                recorder = clean_text(row[10]) if len(row) > 10 else ""

                temp_val = float(temp_str) if re.match(r"^\d+(\.\d+)?$", temp_str) else None
                pulse_val = int(pulse_str) if pulse_str.isdigit() else None
                resp_val = int(resp_str) if resp_str.isdigit() else None
                spo2_val = int(spo2_str) if spo2_str.isdigit() else None

                sbp, dbp = None, None
                if "/" in bp_str:
                    parts = bp_str.split("/")
                    if parts[0].strip().isdigit(): sbp = int(parts[0].strip())
                    if len(parts) > 1 and parts[1].strip().isdigit(): dbp = int(parts[1].strip())

                vs_item = {
                    "resident_id": rid,
                    "resident_name": rname,
                    "bed_name": bed,
                    "measured_date": date,
                    "measured_time": time,
                    "temperature": temp_val,
                    "pulse": pulse_val,
                    "respiration": resp_val,
                    "systolic_bp": sbp,
                    "diastolic_bp": dbp,
                    "blood_pressure": bp_str if bp_str != "/" else "",
                    "spo2": spo2_val,
                    "pain_score": pain_str,
                    "blood_sugar": bs_str,
                    "stool": stool_str,
                    "recorder": recorder
                }
                vital_signs_list.append(vs_item)
                cur.execute("""
                INSERT INTO vital_signs (resident_id, resident_name, bed_name, measured_date, measured_time, temperature, pulse, respiration, systolic_bp, diastolic_bp, blood_pressure, spo2, pain_score, blood_sugar, stool, recorder)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (rid, rname, bed, date, time, temp_val, pulse_val, resp_val, sbp, dbp, bp_str, spo2_val, pain_str, bs_str, stool_str, recorder))

        # 7. 全量護理記錄 (INR20) - 整合 nursing_records_supplement.json
        res_nursing = nursing_supp_data.get(str(rid), {}).get("records", [])
        for n_rec in res_nursing:
            ed = clean_text(n_rec.get("event_date"))
            flag = int(n_rec.get("flag", 2))
            focus = clean_text(n_rec.get("focus"))
            content = clean_text(n_rec.get("content"))
            rec_signer = clean_text(n_rec.get("recorder"))
            tid = clean_text(n_rec.get("task_id"))
            fid = clean_text(n_rec.get("form_id"))
            
            nursing_records_list.append({
                "resident_id": rid,
                "resident_name": rname,
                "bed_name": bed,
                "event_date": ed,
                "record_flag": flag,
                "focus": focus,
                "content": content,
                "recorder": rec_signer,
                "task_id": tid,
                "form_id": fid
            })
            cur.execute("""
            INSERT INTO nursing_records (resident_id, resident_name, bed_name, event_date, record_flag, focus, content, recorder, task_id, form_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rid, rname, bed, ed, flag, focus, content, rec_signer, tid, fid))

        # 8. 針劑血糖記錄單 (INPH)
        inph_rep = reports.get("針劑血糖記錄單", reports.get("針劑血糖", {}))
        for row in inph_rep.get("table", []):
            if len(row) >= 6 and re.search(r"\d{4}/\d{2}/\d{2}", str(row[0])):
                inj_date = clean_text(row[0])
                ac = clean_text(row[1])
                pc = clean_text(row[2])
                site = clean_text(row[3])
                freq = clean_text(row[4])
                drug = clean_text(row[5])
                dose = clean_text(row[6]) if len(row) > 6 else ""
                signer = clean_text(row[7]) if len(row) > 7 else ""
                inj_item = {
                    "resident_id": rid,
                    "resident_name": rname,
                    "bed_name": bed,
                    "record_date": inj_date,
                    "sugar_ac": ac,
                    "sugar_pc": pc,
                    "injection_site": site,
                    "frequency": freq,
                    "drug_name": drug,
                    "dose": dose,
                    "recorder": signer
                }
                insulin_list.append(inj_item)
                cur.execute("""
                INSERT INTO insulin_injections (resident_id, resident_name, bed_name, record_date, sugar_ac, sugar_pc, injection_site, frequency, drug_name, dose, recorder)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (rid, rname, bed, inj_date, ac, pc, site, freq, drug, dose, signer))

        # 9. 血糖紀錄表 (INR36)
        bs_rep = reports.get("血糖紀錄表", reports.get("血糖紀錄", {}))
        for row in bs_rep.get("table", []):
            if len(row) >= 3 and re.search(r"\d{1,2}/\d{1,2}", str(row[0])):
                b_date = clean_text(row[0])
                b_period = clean_text(row[1])
                b_val_str = clean_text(row[2])
                b_val = float(b_val_str) if re.match(r"^\d+(\.\d+)?$", b_val_str) else None
                b_rec = clean_text(row[4]) if len(row) > 4 else ""
                bs_item = {
                    "resident_id": rid,
                    "resident_name": rname,
                    "bed_name": bed,
                    "record_date": b_date,
                    "period": b_period,
                    "sugar_value": b_val,
                    "recorder": b_rec
                }
                blood_sugar_list.append(bs_item)
                cur.execute("""
                INSERT INTO blood_sugar (resident_id, resident_name, bed_name, record_date, period, sugar_value, recorder)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (rid, rname, bed, b_date, b_period, b_val, b_rec))

        # 10. 換管紀錄表 (IReTu)
        tube_rep = reports.get("換管紀錄表", reports.get("換管紀錄", {}))
        for row in tube_rep.get("table", []):
            if len(row) >= 3 and re.search(r"\d{4}/\d{2}/\d{2}", str(row[0])):
                t_date = clean_text(row[0])
                t_name = clean_text(row[1])
                t_spec = clean_text(row[2]) if len(row) > 2 else ""
                t_sit = clean_text(row[3]) if len(row) > 3 else ""
                t_rec = clean_text(row[4]) if len(row) > 4 else ""
                tb_item = {
                    "resident_id": rid,
                    "resident_name": rname,
                    "bed_name": bed,
                    "record_date": t_date,
                    "tube_name": t_name,
                    "tube_spec": t_spec,
                    "situation": t_sit,
                    "recorder": t_rec
                }
                tube_records_list.append(tb_item)
                cur.execute("""
                INSERT INTO tube_records (resident_id, resident_name, bed_name, record_date, tube_name, tube_spec, situation, recorder)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (rid, rname, bed, t_date, t_name, t_spec, t_sit, t_rec))

        # 11. 定期評估量表 (ADL, IADL, 跌倒, 壓傷, 認知, 憂鬱, 尿失禁, 約束, 輔具等)
        periodic_names = [
            "ADL評估量表", "IADL評估量表", "防範跌倒評估記錄表", "壓力性損傷危險評估", 
            "SPMSQ評估量表", "簡易長者憂鬱GDS15", "尿失禁評估單",
            "保護性身體約束評估表", "輔具需求評估表", "鼻胃管移除評估表"
        ]
        for ass_name in periodic_names:
            ass_rep = reports.get(ass_name, {})
            ass_table = ass_rep.get("table", [])
            if ass_table and len(ass_table) > 1:
                date_row_idx = -1
                dates = []
                for idx_candidate in range(min(15, len(ass_table))):
                    row_c = ass_table[idx_candidate]
                    cands = []
                    for d in row_c:
                        d_str = clean_text(d)
                        m = re.match(r"^(\d{4}/\d{2}/\d{2})", d_str)
                        if m and not any(k in d_str for k in ["入住", "出生", "填寫", "中心", "長照", "床號", "項目"]):
                            cands.append(m.group(1))
                    if len(cands) > 0:
                        date_row_idx = idx_candidate
                        dates = cands
                        break
                
                if date_row_idx != -1 and dates:
                    start_row = date_row_idx + 1
                    for row in ass_table[start_row:]:
                        if row:
                            item_label = clean_text(row[0])
                            if any(k in item_label for k in ["中心", "姓名", "床號", "評估項目", "填寫日期", "項目/日期"]):
                                continue
                            for col_idx, d_str in enumerate(dates):
                                val_idx = col_idx + 1
                                if val_idx < len(row):
                                    val_str = clean_text(row[val_idx])
                                    if val_str:
                                        ass_item = {
                                            "resident_id": rid,
                                            "resident_name": rname,
                                            "bed_name": bed,
                                            "assessment_type": ass_name,
                                            "item_name": item_label[:100],
                                            "record_date": d_str[:10],
                                            "value_or_score": val_str
                                        }
                                        assessments_list.append(ass_item)
                                        cur.execute("""
                                        INSERT INTO assessments_periodic (resident_id, resident_name, bed_name, assessment_type, item_name, record_date, value_or_score)
                                        VALUES (?, ?, ?, ?, ?, ?, ?)
                                        """, (rid, rname, bed, ass_name, item_label[:100], d_str[:10], val_str))

        # 12. 復健定期評估表 (IR01) 專屬深入萃取
        rehab_rep = reports.get("復健定期評估表", {})
        rehab_tb = rehab_rep.get("table", [])
        if rehab_tb:
            date_row_indices = [i for i, r in enumerate(rehab_tb) if len(r) > 0 and r[0] == "日期"]
            for dri in date_row_indices:
                d_row = rehab_tb[dri]
                sec_dates = [clean_text(d) for d in d_row[1:] if re.search(r"\d{4}/\d{2}/\d{2}", str(d))]
                if not sec_dates:
                    continue
                for r_idx in range(dri + 1, min(dri + 50, len(rehab_tb))):
                    row_data = rehab_tb[r_idx]
                    if not row_data or (len(row_data) > 0 and row_data[0] == "日期"):
                        break
                    row_title = clean_text(row_data[0])
                    if not row_title:
                        continue
                    for col_idx, s_date in enumerate(sec_dates):
                        v_idx = col_idx + 1
                        if v_idx < len(row_data):
                            val = clean_text(row_data[v_idx])
                            if val:
                                rehab_eval_list.append({
                                    "resident_id": rid,
                                    "resident_name": rname,
                                    "bed_name": bed,
                                    "eval_date": s_date,
                                    "section": "復健定期評估",
                                    "item_title": row_title,
                                    "eval_content": val
                                })
                                cur.execute("""
                                INSERT INTO rehab_evaluations (resident_id, resident_name, bed_name, eval_date, section, item_title, eval_content)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                """, (rid, rname, bed, s_date, "復健定期評估", row_title, val))

        # 13. 專業聯繫照會單 (IR09) 深入萃取
        ref_rep = reports.get("專業聯繫照會單", {})
        ref_tb = ref_rep.get("table", [])
        if ref_tb:
            curr_ref_date = ""
            curr_dept = ""
            curr_prob = ""
            curr_resp = ""
            curr_follow = ""
            
            def save_current_referral():
                nonlocal curr_ref_date, curr_dept, curr_prob, curr_resp, curr_follow
                if curr_prob or curr_resp or curr_follow:
                    referrals_list.append({
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "referral_date": curr_ref_date,
                        "department": curr_dept,
                        "problem_statement": curr_prob,
                        "response": curr_resp,
                        "followup": curr_follow
                    })
                    cur.execute("""
                    INSERT INTO professional_referrals (resident_id, resident_name, bed_name, referral_date, department, problem_statement, response, followup)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (rid, rname, bed, curr_ref_date, curr_dept, curr_prob, curr_resp, curr_follow))
                curr_dept = ""
                curr_prob = ""
                curr_resp = ""
                curr_follow = ""

            for r_row in ref_tb:
                r_str = " ".join(r_row)
                m_dt = re.search(r"填寫日期：\s*(\d{4}/\d{2}/\d{2})", r_str)
                if m_dt:
                    save_current_referral()
                    curr_ref_date = m_dt.group(1)
                elif len(r_row) >= 2:
                    k = clean_text(r_row[0])
                    v = clean_text(" | ".join(r_row[1:]))
                    if k == "照會組別":
                        curr_dept = v
                    elif k == "問題陳述":
                        curr_prob = v
                    elif k == "問題回覆":
                        curr_resp = v
                    elif k == "問題追蹤":
                        curr_follow = v
            save_current_referral()

        # 14. 生化檢驗紀錄表 (ILabo)
        lab_rep = reports.get("生化檢驗紀錄表", {})
        lab_tb = lab_rep.get("table", [])
        if lab_tb and len(lab_tb) > 1:
            hdr_dates = []
            for col_val in lab_tb[1][1:]:
                m_dt = re.search(r"(\d{4}/\d{2}/\d{2})", str(col_val))
                hdr_dates.append(m_dt.group(1) if m_dt else "")
            
            curr_lab_cat = "生化檢驗"
            for row in lab_tb[2:]:
                if len(row) >= 3:
                    item_name = clean_text(row[0])
                    unit = clean_text(row[-2]) if len(row) >= 6 else ""
                    ref_range = clean_text(row[-1]) if len(row) >= 6 else ""
                    for c_idx, l_date in enumerate(hdr_dates):
                        if l_date and c_idx + 1 < len(row):
                            val = clean_text(row[c_idx + 1])
                            if val and val not in ["單位", "參考區間"]:
                                lab_tests_list.append({
                                    "resident_id": rid,
                                    "resident_name": rname,
                                    "bed_name": bed,
                                    "test_date": l_date,
                                    "category": curr_lab_cat,
                                    "item_name": item_name,
                                    "test_value": val,
                                    "unit": unit,
                                    "reference_range": ref_range
                                })
                                cur.execute("""
                                INSERT INTO lab_test_records (resident_id, resident_name, bed_name, test_date, category, item_name, test_value, unit, reference_range)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (rid, rname, bed, l_date, curr_lab_cat, item_name, val, unit, ref_range))

        # 15. 營養治療紀錄
        # Structure: each evaluation has 2 header 床號 rows with the SAME 評估日期,
        # followed by ~33 content rows each. We must deduplicate by (date, resident).
        nut_rep = reports.get("營養治療紀錄", {})
        nut_tb = nut_rep.get("table", [])
        if nut_tb:
            curr_nut_date = ""
            curr_nut_reason = ""
            curr_nut_items = []
            seen_nut_dates = set()

            def save_nutrition_record():
                nonlocal curr_nut_date, curr_nut_reason, curr_nut_items
                if curr_nut_items and curr_nut_date and curr_nut_date not in seen_nut_dates:
                    seen_nut_dates.add(curr_nut_date)
                    content_str = "\n".join(curr_nut_items)
                    nutrition_list.append({
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "eval_date": curr_nut_date,
                        "eval_reason": curr_nut_reason,
                        "assessment_content": content_str
                    })
                    cur.execute("""
                    INSERT INTO nutrition_therapy_records (resident_id, resident_name, bed_name, eval_date, eval_reason, assessment_content)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (rid, rname, bed, curr_nut_date, curr_nut_reason, content_str))
                curr_nut_items = []

            for r_row in nut_tb:
                r_str = " ".join(r_row)
                m_dt = re.search(r"評估日期：\s*(\d{4}/\d{2}/\d{2})", r_str)
                if m_dt:
                    new_date = m_dt.group(1)
                    if new_date != curr_nut_date:
                        # Genuinely new evaluation date - save previous and start fresh
                        save_nutrition_record()
                        curr_nut_date = new_date
                        curr_nut_reason = ""
                    # If same date repeated (duplicate header), skip - continue accumulating
                elif len(r_row) >= 2:
                    k = clean_text(r_row[0])
                    v = clean_text(" | ".join(r_row[1:]))
                    if k == "評估原因":
                        curr_nut_reason = v
                    else:
                        curr_nut_items.append(f"{k}: {v}")
            save_nutrition_record()

        # 16. 復健運動執行紀錄
        ex_rep = reports.get("復健運動執行紀錄", {})
        ex_tb = ex_rep.get("table", [])
        if ex_tb and len(ex_tb) > 3:
            item_names = ex_tb[3] if len(ex_tb) > 3 else []
            for row in ex_tb[4:]:
                if len(row) >= 2 and re.search(r"\d{4}/\d{2}/\d{2}", str(row[0])):
                    l_date = clean_text(row[0])
                    signer = clean_text(row[-1]) if len(row) > 2 else ""
                    for c_idx in range(1, min(len(row) - 1, len(item_names))):
                        val = clean_text(row[c_idx])
                        item_label = clean_text(item_names[c_idx]) if c_idx < len(item_names) else f"項目{c_idx}"
                        if val:
                            rehab_exercise_list.append({
                                "resident_id": rid,
                                "resident_name": rname,
                                "bed_name": bed,
                                "log_date": l_date,
                                "item_name": item_label,
                                "completion_rate": val,
                                "recorder": signer
                            })
                            cur.execute("""
                            INSERT INTO rehab_exercise_logs (resident_id, resident_name, bed_name, log_date, item_name, completion_rate, recorder)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, (rid, rname, bed, l_date, item_label, val, signer))

        # 17. 照服員班別紀錄 (白班, 夜班)
        for shift_name in ["白班照顧服務記錄表", "夜班照顧服務記錄表", "白班照顧記錄", "夜班照顧記錄"]:
            sh_rep = reports.get(shift_name, {})
            sh_table = sh_rep.get("table", [])
            for row in sh_table:
                if len(row) >= 2:
                    col0 = clean_text(row[0])
                    # Filter out table/resident header rows
                    if col0 in ["時間", "簽名"] or col0.startswith("姓名") or col0.startswith("床號"):
                        continue
                    
                    # If col0 is a time/hour digit (e.g. '8', '9', '20')
                    if col0.isdigit():
                        time_slot = col0 + ":00"
                        item_name = clean_text(row[1])
                        content = clean_text(" | ".join(row[2:]))
                    else:
                        # Summary rows at bottom of shift (給水量, 大便, 皮膚, 食慾, 情緒...)
                        time_slot = "當班總評"
                        item_name = col0
                        content = clean_text(" | ".join(row[1:]))
                    
                    if item_name:
                        daily_care_shifts_list.append({
                            "resident_id": rid,
                            "resident_name": rname,
                            "bed_name": bed,
                            "shift": shift_name[:2],
                            "time_slot": time_slot,
                            "item_name": item_name,
                            "content": content
                        })
                        cur.execute("""
                        INSERT INTO daily_care_shifts (resident_id, resident_name, bed_name, shift, item_name, time_slot, content_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (rid, rname, bed, shift_name[:2], item_name, time_slot, content))

        # 18. 社工與個案紀錄 (個案記錄表, 社工定期評估, 社工初評及適應評估)
        for sw_name in ["個案記錄表", "社工定期評估", "社工初評及適應評估", "社會心理適應評估表"]:
            sw_rep = reports.get(sw_name, {})
            sw_table = sw_rep.get("table", [])
            curr_rec_date = admission_date  # fallback: use admission date

            for row in sw_table:
                if not row: continue
                row0_str = str(row[0])

                # 個案記錄表: date is in row[0] (e.g. "2025/01/03")
                if sw_name == "個案記錄表":
                    if re.search(r"\d{4}/\d{2}/\d{2}", row0_str) and row0_str not in ["姓名", "日期"]:
                        curr_rec_date = clean_text(row0_str)

                # 社工定期評估: Row 1 = ['評估', 'YYYY/MM/DD 00:00YYYY/MM/DD', ...]
                # Extract first date found in any column
                elif sw_name == "社工定期評估":
                    if row0_str == "評估" or (not re.search(r"\d{4}/\d{2}/\d{2}", row0_str)):
                        # Check all cells for a date
                        row_str = " ".join(row)
                        m_sw_dt = re.search(r"(\d{4}/\d{2}/\d{2})", row_str)
                        if m_sw_dt and row0_str == "評估":
                            curr_rec_date = m_sw_dt.group(1)

                # 社工初評及適應評估: look for 初評日期
                elif sw_name == "社工初評及適應評估":
                    row_str = " ".join(row)
                    m_init = re.search(r"初評日期[,，：:\s]*(\d{4}/\d{2}/\d{2})", row_str)
                    if m_init:
                        curr_rec_date = m_init.group(1)

                # 社會心理適應評估表: look for 入住日期 in row data
                elif sw_name == "社會心理適應評估表":
                    row_str = " ".join(row)
                    m_adm2 = re.search(r"入住日期[,，：:\s]*(\d{4}/\d{2}/\d{2})", row_str)
                    if m_adm2:
                        curr_rec_date = m_adm2.group(1)

                if len(row) >= 2 and row0_str not in ["姓名", "日期", "項目/日期", "項目/分數", "評估"]:
                    if row0_str.startswith("姓名") or row0_str.startswith("床號"):
                        continue
                    t_title = clean_text(row[1]) if len(row) > 1 else clean_text(row[0])
                    t_val = clean_text(" | ".join(row[2:])) if len(row) > 2 else clean_text(row[1])
                    if (t_title or t_val) and curr_rec_date:
                        social_work_list.append({
                            "resident_id": rid,
                            "resident_name": rname,
                            "bed_name": bed,
                            "form_type": sw_name,
                            "record_date": curr_rec_date,
                            "record_title": t_title,
                            "record_content": t_val
                        })
                        cur.execute("""
                        INSERT INTO social_work_records (resident_id, resident_name, bed_name, form_type, record_date, record_title, record_content)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (rid, rname, bed, sw_name, curr_rec_date, t_title, t_val))


        # 19. 藥師定期評估表
        # Structure: blocks of 6 rows each, starting at row[0]=="床號:..."
        # Fields per block: 床號/罹患疾病/目前用藥/服藥評估記錄/追蹤結果/訪視藥師
        # NOTE: The source data does NOT contain an eval_date field;
        #       eval_date will remain empty for all pharmacist records.
        pharm_rep = reports.get("藥師定期評估表", reports.get("藥師定期評估", {}))
        pharm_table = pharm_rep.get("table", [])
        if pharm_table:
            curr_pharm_items = {}
            def save_pharm_block():
                nonlocal curr_pharm_items
                if curr_pharm_items:
                    title = "目前服藥情形追蹤藥師評估記錄"
                    content_parts = []
                    for k, v in curr_pharm_items.items():
                        if k not in ["bed_header"] and v:
                            content_parts.append(f"{k}: {v}")
                    content_str = "\n".join(content_parts)
                    pharmacist_list.append({
                        "resident_id": rid,
                        "resident_name": rname,
                        "bed_name": bed,
                        "eval_date": "",
                        "item_title": title,
                        "eval_content": content_str
                    })
                    cur.execute("""
                    INSERT INTO pharmacist_evaluations (resident_id, resident_name, bed_name, eval_date, item_title, eval_content)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (rid, rname, bed, "", title, content_str))
                curr_pharm_items = {}

            for row in pharm_table:
                if not row: continue
                # New block when row[0] starts with "床號:"
                if str(row[0]).startswith("床號:") and len(row) >= 2:
                    save_pharm_block()
                    curr_pharm_items = {"bed_header": clean_text(" | ".join(row))}
                elif len(row) >= 2:
                    p_title = clean_text(row[0])
                    p_val = clean_text(" | ".join(row[1:]))
                    if p_title and p_title != "姓名：":
                        curr_pharm_items[p_title] = p_val
                elif len(row) == 1 and row[0]:
                    # Single-cell rows like "訪視藥師：陳冠宇"
                    curr_pharm_items["訪視藥師"] = clean_text(row[0])
            save_pharm_block()

        # 20. 長輩全報告聚合包 (all_reports_by_resident)
        resident_reports_map[str(rid)] = {
            "profile": res_record,
            "reports_available": list(reports.keys()) + (["護理記錄"] if res_nursing else []),
            "reports_data": {
                rep_k: rep_v.get("table", []) for rep_k, rep_v in reports.items()
            },
            "nursing_records": res_nursing
        }

    conn.commit()
    conn.close()

    print("寫入模組化 JSON 檔案中...")
    files_to_write = [
        ("residents.json", residents_list),
        ("nursing_records.json", nursing_records_list),
        ("vital_signs.json", vital_signs_list),
        ("doctor_visits.json", doctor_visits_list),
        ("blood_sugar.json", blood_sugar_list),
        ("insulin_injections.json", insulin_list),
        ("tube_records.json", tube_records_list),
        ("weight_history.json", weight_history_list),
        ("assessments_periodic.json", assessments_list),
        ("comprehensive_assessments.json", comprehensive_list),
        ("physical_evaluations.json", physical_list),
        ("daily_care_shifts.json", daily_care_shifts_list),
        ("social_work_records.json", social_work_list),
        ("pharmacist_evaluations.json", pharmacist_list),
        ("interdisciplinary_plans.json", plans_list),
        ("rehab_evaluations.json", rehab_eval_list),
        ("professional_referrals.json", referrals_list),
        ("lab_test_records.json", lab_tests_list),
        ("nutrition_therapy_records.json", nutrition_list),
        ("rehab_exercise_logs.json", rehab_exercise_list),
        ("all_reports_by_resident.json", resident_reports_map)
    ]

    for fname, data_obj in files_to_write:
        with open(f"{out_dir}/{fname}", "w", encoding="utf-8") as f:
            json.dump(data_obj, f, ensure_ascii=False, indent=2)

    manifest = {
        "status": "success",
        "processed_at": datetime.now().isoformat(),
        "total_residents": len(residents_list),
        "sqlite_path": sqlite_path,
        "sqlite_size_mb": round(os.path.getsize(sqlite_path) / (1024*1024), 2),
        "tables_count": {
            "residents": len(residents_list),
            "nursing_records": len(nursing_records_list),
            "vital_signs": len(vital_signs_list),
            "doctor_visits": len(doctor_visits_list),
            "blood_sugar": len(blood_sugar_list),
            "insulin_injections": len(insulin_list),
            "tube_records": len(tube_records_list),
            "weight_history": len(weight_history_list),
            "assessments_periodic": len(assessments_list),
            "comprehensive_assessments": len(comprehensive_list),
            "physical_evaluations": len(physical_list),
            "daily_care_shifts": len(daily_care_shifts_list),
            "social_work_records": len(social_work_list),
            "pharmacist_evaluations": len(pharmacist_list),
            "interdisciplinary_plans": len(plans_list),
            "rehab_evaluations": len(rehab_eval_list),
            "professional_referrals": len(referrals_list),
            "lab_test_records": len(lab_tests_list),
            "nutrition_therapy_records": len(nutrition_list),
            "rehab_exercise_logs": len(rehab_exercise_list)
        }
    }
    with open(f"{out_dir}/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n🎉 === 100% 全機構 63 類表單 ETL（含全量護理紀錄）清洗完成 ===")
    print(f"1. SQLite 資料庫: {sqlite_path} ({manifest['sqlite_size_mb']} MB)")
    print(f"2. 模組化 JSON 目錄: {out_dir}/ (共 21 個模組化檔案)")
    for tbl, cnt in manifest["tables_count"].items():
        print(f"   - {tbl:28s}: {cnt:6,d} 筆紀錄")

if __name__ == "__main__":
    run_full_etl()
