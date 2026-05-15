import json
import urllib.request
import csv
from datetime import datetime, timedelta

def fetch_gold_price_1year():
    # 1년 전 ~ 현재 날짜 계산
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    url = "https://koreagoldx.co.kr/api/price/chart/list"
    
    # API 요청 헤더
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
    }
    
    # POST 데이터 (1년치 데이터 요청)
    payload = {
        "srchDt": "1Y",
        "type": "Au",
        "dataDateStart": start_date.strftime("%Y.%m.%d"),
        "dataDateEnd": end_date.strftime("%Y.%m.%d")
    }
    
    # 데이터를 JSON으로 변환하여 인코딩
    data = json.dumps(payload).encode('utf-8')
    
    # Request 객체 생성
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    print(f"{start_date.strftime('%Y.%m.%d')} ~ {end_date.strftime('%Y.%m.%d')} 기간의 시세를 가져옵니다...")
    
    try:
        # API 요청 보내기
        with urllib.request.urlopen(req) as response:
            if response.getcode() == 200:
                resp_data = json.loads(response.read().decode('utf-8'))
                items = resp_data.get('list', [])
                
                if not items:
                    print("데이터가 없습니다.")
                    return
                
                print(f"총 {len(items)}개의 시세 데이터를 성공적으로 가져왔습니다.")
                
                # CSV 파일로 저장
                filename = "gold_price_1year.csv"
                save_to_csv(items, filename)
                
            else:
                print(f"API 요청 실패: HTTP {response.getcode()}")
                
    except Exception as e:
        print(f"크롤링 중 오류가 발생했습니다: {e}")

def save_to_csv(items, filename):
    # CSV 헤더 정의
    headers = [
        "날짜", "순금_살때", "순금_팔때", 
        "18K_살때", "18K_팔때", 
        "14K_살때", "14K_팔때", 
        "백금_살때", "백금_팔때", 
        "은_살때", "은_팔때"
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for item in items:
            row = [
                item.get('date', ''),
                item.get('s_pure', ''),
                item.get('p_pure', ''),
                item.get('s_18k', ''),
                item.get('p_18k', ''),
                item.get('s_14k', ''),
                item.get('p_14k', ''),
                item.get('s_white', ''),
                item.get('p_white', ''),
                item.get('s_silver', ''),
                item.get('p_silver', '')
            ]
            writer.writerow(row)
            
    print(f"데이터가 {filename} 파일에 저장되었습니다.")

if __name__ == "__main__":
    fetch_gold_price_1year()
