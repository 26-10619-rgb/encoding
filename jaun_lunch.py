import urllib.request
import urllib.parse
import json
import datetime

def get_school_info(school_name):
    """
    나이스 API를 통해 학교 이름으로 시도교육청코드와 표준학교코드를 검색합니다.
    """
    url = "https://open.neis.go.kr/hub/schoolInfo"
    params = {
        "Type": "json",
        "SCHUL_NM": school_name
    }
    
    query_string = urllib.parse.urlencode(params)
    request_url = f"{url}?{query_string}"
    
    try:
        req = urllib.request.Request(request_url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if "schoolInfo" in data:
                row = data["schoolInfo"][1]["row"]
                # 도봉구에 있는 학교를 우선적으로 찾습니다 (동명이교 방지)
                for school in row:
                    address = school.get("ORG_RDNMA", "")
                    if "도봉구" in address:
                        return school["ATPT_OFCDC_SC_CODE"], school["SD_SCHUL_CODE"], school["SCHUL_NM"]
                
                # 도봉구가 안 보이면 첫 번째 검색 결과 반환
                return row[0]["ATPT_OFCDC_SC_CODE"], row[0]["SD_SCHUL_CODE"], row[0]["SCHUL_NM"]
    except Exception as e:
        print(f"학교 정보 검색 중 오류 발생: {e}")
        
    print("학교 정보를 찾을 수 없습니다. 나이스 API 서버 상태를 확인해주세요.")
    return None, None, None

def get_lunch_info(office_code, school_code, date_str):
    """
    나이스 API를 통해 특정 날짜의 급식 정보를 가져옵니다.
    """
    url = "https://open.neis.go.kr/hub/mealServiceDietInfo"
    params = {
        "Type": "json",
        "ATPT_OFCDC_SC_CODE": office_code,
        "SD_SCHUL_CODE": school_code,
        "MLSV_YMD": date_str
    }
    
    query_string = urllib.parse.urlencode(params)
    request_url = f"{url}?{query_string}"
    
    try:
        req = urllib.request.Request(request_url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            print(f"\n[ {date_str[:4]}년 {date_str[4:6]}월 {date_str[6:]}일 급식 메뉴 ]")
            
            if "mealServiceDietInfo" in data:
                rows = data["mealServiceDietInfo"][1]["row"]
                for row in rows:
                    print(f"--- {row['MMEAL_SC_NM']} ---")
                    
                    # 메뉴에 포함된 <br/>을 줄바꿈으로 변경
                    dish = row['DDISH_NM'].replace("<br/>", "\n")
                    
                    print(dish)
                    print(f"\n칼로리: {row['CAL_INFO']}\n")
            else:
                print("해당 날짜의 급식 정보가 없습니다 (주말, 공휴일, 혹은 정보 미등록).")
    except Exception as e:
        print(f"급식 정보 조회 중 오류 발생: {e}")

def main():
    school_name = "자운고등학교"
    print(f"=== {school_name} 급식 정보 조회 프로그램 ===")
    print("학교 정보를 나이스(NEIS) 서버에서 불러오는 중입니다...")
    
    office_code, school_code, found_name = get_school_info(school_name)
    if not office_code:
        return
        
    print(f"학교 인식 완료: {found_name}")
    print("\n1. 오늘 급식 조회")
    print("2. 내일 급식 조회")
    print("3. 특정 날짜 급식 조회 (예: 20240515)")
    
    choice = input("\n선택 (1~3, 엔터 누르면 오늘 날짜로 자동 조회): ").strip()
    
    today = datetime.datetime.now()
    
    if choice == '2':
        target_date = today + datetime.timedelta(days=1)
        date_str = target_date.strftime("%Y%m%d")
    elif choice == '3':
        date_str = input("조회할 날짜를 입력하세요 (YYYYMMDD 형식): ").strip()
        if not date_str.isdigit() or len(date_str) != 8:
            print("잘못된 입력입니다. 오늘 날짜로 조회합니다.")
            date_str = today.strftime("%Y%m%d")
    else:
        date_str = today.strftime("%Y%m%d")
        
    get_lunch_info(office_code, school_code, date_str)

if __name__ == "__main__":
    main()
