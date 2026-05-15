document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const monthDisplay = document.getElementById('month-display');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const calendarLoading = document.getElementById('calendar-loading');
    
    const dateDisplay = document.getElementById('date-display');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const mealDataContainer = document.getElementById('meal-data');
    const menuList = document.getElementById('menu-list');
    const caloriesDisplay = document.getElementById('calories-display');

    // State
    const schoolName = "자운고등학교";
    let officeCode = null;
    let schoolCode = null;
    
    let currentDate = new Date(); // Date used for calendar navigation
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth(); // 0-indexed
    
    let activeDateStr = null; // Currently selected date
    let monthlyMealCache = {}; // { "20260515": { dishes: [...], calories: "..." } }

    // Helpers
    const padZero = (num) => String(num).padStart(2, '0');
    
    const formatDateYMD = (year, month, day) => {
        return `${year}${padZero(month + 1)}${padZero(day)}`;
    };

    const formatDisplayDate = (year, month, day) => {
        const date = new Date(year, month, day);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${year}년 ${month + 1}월 ${day}일 (${days[date.getDay()]})`;
    };

    // 1. 학교 정보 가져오기 (최초 1회)
    const initApp = async () => {
        try {
            calendarLoading.classList.remove('hidden');
            
            const schoolUrl = `https://open.neis.go.kr/hub/schoolInfo?Type=json&SCHUL_NM=${encodeURIComponent(schoolName)}`;
            const res = await fetch(schoolUrl);
            const data = await res.json();

            if (!data.schoolInfo) throw new Error("학교 정보를 찾을 수 없습니다.");

            const rows = data.schoolInfo[1].row;
            for (const school of rows) {
                if (school.ORG_RDNMA && school.ORG_RDNMA.includes("도봉구")) {
                    officeCode = school.ATPT_OFCDC_SC_CODE;
                    schoolCode = school.SD_SCHUL_CODE;
                    break;
                }
            }
            if (!officeCode) {
                officeCode = rows[0].ATPT_OFCDC_SC_CODE;
                schoolCode = rows[0].SD_SCHUL_CODE;
            }

            // 초기 데이터(이번 달) 불러오기
            await fetchAndRenderMonth(currentYear, currentMonth);
            
            // 오늘 날짜 자동 선택
            const today = new Date();
            if (today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
                selectDate(currentYear, currentMonth, today.getDate());
            }

        } catch (error) {
            calendarLoading.classList.add('hidden');
            showError("초기화 중 오류가 발생했습니다: " + error.message);
        }
    };

    // 2. 월간 급식 데이터 호출
    const fetchAndRenderMonth = async (year, month) => {
        calendarLoading.classList.remove('hidden');
        calendarDays.innerHTML = ''; // Clear current calendar
        monthlyMealCache = {}; // Reset cache for new month

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const fromDate = formatDateYMD(year, month, 1);
        const toDate = formatDateYMD(year, month, lastDay.getDate());

        monthDisplay.textContent = `${year}년 ${month + 1}월`;

        try {
            if (!officeCode || !schoolCode) throw new Error("학교 코드가 설정되지 않았습니다.");

            const mealUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${fromDate}&MLSV_TO_YMD=${toDate}&pSize=100`;
            
            const res = await fetch(mealUrl);
            const data = await res.json();

            if (data.mealServiceDietInfo) {
                const rows = data.mealServiceDietInfo[1].row;
                rows.forEach(row => {
                    // MMEAL_SC_NM === '중식' 위주로 처리하거나 그냥 다 받아서 덮어씀 (일반적으로 고등학교는 중식, 석식 있음)
                    // 여기서는 단순히 첫 번째 들어오는 급식을 저장
                    const dateKey = row.MLSV_YMD; 
                    if (!monthlyMealCache[dateKey]) {
                        monthlyMealCache[dateKey] = {
                            type: row.MMEAL_SC_NM,
                            dishes: row.DDISH_NM.split('<br/>'),
                            calories: row.CAL_INFO
                        };
                    }
                });
            }
            // 급식이 없는 달(방학 등)은 에러가 아니라 빈 객체 유지

            renderCalendarGrid(year, month);
        } catch (error) {
            showError("급식 데이터를 불러오는데 실패했습니다.");
            renderCalendarGrid(year, month); // 그래도 달력은 그림
        } finally {
            calendarLoading.classList.add('hidden');
        }
    };

    // 3. 달력 그리드 렌더링
    const renderCalendarGrid = (year, month) => {
        calendarDays.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay(); // 0(일) ~ 6(토)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const currentDay = today.getDate();

        // 빈 셀 (이전 달)
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarDays.appendChild(emptyCell);
        }

        // 날짜 셀
        for (let i = 1; i <= daysInMonth; i++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.textContent = i;
            
            // 일요일 빨간색, 토요일 파란색
            const dayOfWeek = (firstDay + i - 1) % 7;
            if (dayOfWeek === 0) cell.classList.add('sun');
            if (dayOfWeek === 6) cell.classList.add('sat');

            const dateStr = formatDateYMD(year, month, i);

            // 오늘 표시
            if (isCurrentMonth && i === currentDay) {
                cell.classList.add('today');
            }

            // 급식 있는 날 점 표시
            if (monthlyMealCache[dateStr]) {
                cell.classList.add('has-meal');
            }

            // 활성화(선택) 표시
            if (activeDateStr === dateStr) {
                cell.classList.add('active');
            }

            // 클릭 이벤트
            cell.addEventListener('click', () => {
                // 이전 활성 셀 해제
                document.querySelectorAll('.day-cell.active').forEach(el => el.classList.remove('active'));
                cell.classList.add('active');
                
                selectDate(year, month, i);
            });

            calendarDays.appendChild(cell);
        }
    };

    // 4. 날짜 선택 처리 (우측 패널 업데이트)
    const selectDate = (year, month, day) => {
        activeDateStr = formatDateYMD(year, month, day);
        dateDisplay.textContent = formatDisplayDate(year, month, day);
        
        errorMessage.classList.add('hidden');

        const mealData = monthlyMealCache[activeDateStr];

        if (mealData) {
            emptyState.classList.add('hidden');
            mealDataContainer.classList.remove('hidden');
            
            menuList.innerHTML = '';
            mealData.dishes.forEach(dish => {
                const li = document.createElement('li');
                li.className = 'menu-item';
                
                const allergyMatch = dish.match(/([0-9\.\(\)]+)$/);
                let menuName = dish;
                let allergyInfo = '';
                
                if (allergyMatch) {
                    allergyInfo = allergyMatch[0];
                    menuName = dish.replace(allergyInfo, '').trim();
                    if (!allergyInfo.startsWith('(')) {
                        allergyInfo = `(${allergyInfo.replace(/\.$/, '')})`;
                    }
                }

                li.innerHTML = `
                    <span class="menu-name">${menuName}</span>
                    ${allergyInfo ? `<span class="allergy-info">${allergyInfo}</span>` : ''}
                `;
                menuList.appendChild(li);
            });

            caloriesDisplay.textContent = mealData.calories;
        } else {
            emptyState.classList.remove('hidden');
            mealDataContainer.classList.add('hidden');
        }
    };

    const showError = (msg) => {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
        emptyState.classList.add('hidden');
        mealDataContainer.classList.add('hidden');
    };

    // Event Listeners for Navigation
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        fetchAndRenderMonth(currentYear, currentMonth);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        fetchAndRenderMonth(currentYear, currentMonth);
    });

    // 시작
    initApp();
});
