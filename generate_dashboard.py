import csv
import json
from collections import defaultdict

def create_dashboard():
    # CSV 데이터 읽기
    dates = []
    pure_buy, pure_sell = [], []
    k18_buy, k18_sell = [], []
    k14_buy, k14_sell = [], []
    silver_buy, silver_sell = [], []
    white_buy, white_sell = [], []
    pure_margin = []
    
    try:
        with open('gold_price_1year.csv', 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            # 날짜순으로 정렬하기 위해 데이터를 리스트에 담음
            rows = list(reader)
            # 날짜(오름차순) 정렬: 현재 데이터가 최신순일 가능성이 큼
            rows.sort(key=lambda x: x['날짜'])
            
            # 일별 마지막 데이터만 유지 (하루에 여러번 변동될 수 있으므로)
            daily_data = {}
            for row in rows:
                date_str = row['날짜'].split()[0] # YYYY-MM-DD
                daily_data[date_str] = row
                
            for date_str, row in daily_data.items():
                dates.append(date_str)
                pb = int(row['순금_살때']) if row['순금_살때'] else 0
                ps = int(row['순금_팔때']) if row['순금_팔때'] else 0
                pure_buy.append(pb)
                pure_sell.append(ps)
                pure_margin.append(pb - ps)
                
                k18_buy.append(int(row['18K_살때']) if row['18K_살때'] else 0)
                k18_sell.append(int(row['18K_팔때']) if row['18K_팔때'] else 0)
                
                k14_buy.append(int(row['14K_살때']) if row['14K_살때'] else 0)
                k14_sell.append(int(row['14K_팔때']) if row['14K_팔때'] else 0)
                
                silver_buy.append(int(row['은_살때']) if row['은_살때'] else 0)
                silver_sell.append(int(row['은_팔때']) if row['은_팔때'] else 0)
                
                white_buy.append(int(row['백금_살때']) if row['백금_살때'] else 0)
                white_sell.append(int(row['백금_팔때']) if row['백금_팔때'] else 0)
                
    except FileNotFoundError:
        print("gold_price_1year.csv 파일이 없습니다. 먼저 크롤링을 실행해주세요.")
        return

    # HTML 템플릿 작성 (ApexCharts 사용)
    html_content = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>금 시세 대시보드 (최근 1년)</title>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <style>
        :root {{
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }}
        body {{
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
        }}
        .dashboard-container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .header h1 {{
            font-size: 2.5rem;
            margin: 0 0 10px 0;
            background: linear-gradient(90deg, #fbbf24, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .header p {{
            color: var(--text-muted);
            margin: 0;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }}
        .card {{
            background: var(--card-bg);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #334155;
        }}
        .card.full-width {{
            grid-column: 1 / -1;
        }}
        .chart-title {{
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #e2e8f0;
        }}
        @media (max-width: 1024px) {{
            .grid {{ grid-template-columns: 1fr; }}
        }}
    </style>
</head>
<body>

<div class="dashboard-container">
    <div class="header">
        <h1>📈 금/은 시세 대시보드</h1>
        <p>최근 1년간의 한국금거래소 시세 변동 추이</p>
    </div>

    <div class="grid">
        <!-- 순금 차트 -->
        <div class="card full-width">
            <div class="chart-title">✨ 순금 (24K) 살때 / 팔때 시세 추이</div>
            <div id="pureGoldChart"></div>
        </div>

        <!-- 18K / 14K 팔때 차트 -->
        <div class="card">
            <div class="chart-title">💍 18K / 14K 매입(팔때) 시세</div>
            <div id="alloyGoldChart"></div>
        </div>

        <!-- 은 / 백금 차트 -->
        <div class="card">
            <div class="chart-title">🪙 은 / 백금 살때 시세</div>
            <div id="silverWhiteChart"></div>
        </div>
        
        <!-- 마진 차트 -->
        <div class="card full-width">
            <div class="chart-title">📊 순금 살때-팔때 가격 차이 (스프레드)</div>
            <div id="marginChart"></div>
        </div>
    </div>
</div>

<script>
    // 데이터 준비
    const dates = {json.dumps(dates)};
    
    // 공통 차트 옵션
    const commonOptions = {{
        chart: {{
            height: 350,
            type: 'area',
            background: 'transparent',
            toolbar: {{ show: true, theme: 'dark' }},
            zoom: {{ enabled: true }}
        }},
        theme: {{ mode: 'dark' }},
        dataLabels: {{ enabled: false }},
        stroke: {{ curve: 'smooth', width: 2 }},
        xaxis: {{
            categories: dates,
            type: 'datetime',
            labels: {{ datetimeUTC: false, style: {{ colors: '#94a3b8' }} }},
            axisBorder: {{ show: false }},
            axisTicks: {{ show: false }},
            tooltip: {{ enabled: false }}
        }},
        yaxis: {{
            labels: {{
                formatter: (value) => {{ return value.toLocaleString() + '원' }},
                style: {{ colors: '#94a3b8' }}
            }}
        }},
        grid: {{ borderColor: '#334155', strokeDashArray: 4 }},
        tooltip: {{ theme: 'dark' }}
    }};

    // 1. 순금 차트
    const pureGoldOptions = {{
        ...commonOptions,
        colors: ['#fbbf24', '#f87171'],
        series: [
            {{ name: '순금 살때', data: {json.dumps(pure_buy)} }},
            {{ name: '순금 팔때', data: {json.dumps(pure_sell)} }}
        ],
        fill: {{
            type: 'gradient',
            gradient: {{ shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] }}
        }}
    }};
    new ApexCharts(document.querySelector("#pureGoldChart"), pureGoldOptions).render();

    // 2. 18K / 14K 차트
    const alloyOptions = {{
        ...commonOptions,
        chart: {{ ...commonOptions.chart, type: 'line' }},
        colors: ['#a78bfa', '#60a5fa'],
        series: [
            {{ name: '18K 팔때', data: {json.dumps(k18_sell)} }},
            {{ name: '14K 팔때', data: {json.dumps(k14_sell)} }}
        ]
    }};
    new ApexCharts(document.querySelector("#alloyGoldChart"), alloyOptions).render();

    // 3. 은 / 백금 차트
    const silverWhiteOptions = {{
        ...commonOptions,
        chart: {{ ...commonOptions.chart, type: 'line' }},
        colors: ['#cbd5e1', '#2dd4bf'],
        series: [
            {{ name: '은 살때', data: {json.dumps(silver_buy)} }},
            {{ name: '백금 살때', data: {json.dumps(white_buy)} }}
        ],
        yaxis: [
            {{
                title: {{ text: '은 시세', style: {{ color: '#cbd5e1' }} }},
                labels: {{ formatter: (val) => val.toLocaleString() + '원', style: {{ colors: '#cbd5e1' }} }}
            }},
            {{
                opposite: true,
                title: {{ text: '백금 시세', style: {{ color: '#2dd4bf' }} }},
                labels: {{ formatter: (val) => val.toLocaleString() + '원', style: {{ colors: '#2dd4bf' }} }}
            }}
        ]
    }};
    new ApexCharts(document.querySelector("#silverWhiteChart"), silverWhiteOptions).render();

    // 4. 마진 (스프레드) 차트
    const marginOptions = {{
        ...commonOptions,
        chart: {{ ...commonOptions.chart, type: 'bar', height: 250 }},
        colors: ['#ec4899'],
        series: [
            {{ name: '살때-팔때 가격차', data: {json.dumps(pure_margin)} }}
        ],
        plotOptions: {{
            bar: {{ borderRadius: 2, columnWidth: '60%' }}
        }}
    }};
    new ApexCharts(document.querySelector("#marginChart"), marginOptions).render();

</script>
</body>
</html>
"""

    with open('dashboard.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    print("성공적으로 대시보드를 생성했습니다! 'dashboard.html' 파일을 브라우저에서 열어보세요.")

if __name__ == '__main__':
    create_dashboard()
