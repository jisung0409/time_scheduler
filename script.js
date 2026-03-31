// === 보안 강화: API 키를 소스코드에 직접 적지 않습니다! ===
// 사용자가 웹사이트를 처음 방문할 때 API 키를 물어보고, 브라우저(localStorage)에만 저장합니다.
// 이렇게 하면 GitHub에 소스코드를 올려도 본인의 API 키는 안전하게 보호됩니다.
let API_KEY = localStorage.getItem('GEMINI_API_KEY') || '';

// 만약 저장된 API 키가 없다면, 사용자에게 입력을 요청합니다.
if (!API_KEY) {
    const userKey = prompt('구글 제미나이(Gemini) API 키를 입력해 주세요.\n(이 키는 브라우저에만 안전하게 저장되며, 소스코드에는 남지 않습니다.)');
    if (userKey) {
        API_KEY = userKey.trim();
        localStorage.setItem('GEMINI_API_KEY', API_KEY);
        alert('API 키가 저장되었습니다! 이제 목표를 입력하고 퀘스트를 생성해 보세요.');
    }
}

// 웹페이지의 요소(태그)들을 자바스크립트로 조종하기 위해 이름을 달아 가져옵니다.
// index.html에서 id 속성으로 적어둔 이름표를 찾아 꺼내옵니다.
const goalInput = document.getElementById('goalInput'); // 목표를 적는 입력칸
const generateBtn = document.getElementById('generateBtn'); // 퀘스트 생성 버튼
const loadingIndicator = document.getElementById('loading'); // 로딩 중 화면
const questContainer = document.getElementById('questContainer'); // 퀘스트 카드가 들어갈 큰 상자

// '퀘스트 생성' 버튼을 마우스로 '클릭'했을 때 아래의 generateQuests 함수가 실행되도록 설정합니다.
generateBtn.addEventListener('click', generateQuests);

// 목표 입력칸에서 키보드의 '엔터(Enter)' 키를 눌렀을 때도 버튼을 누른 것처럼 동작하게 만듭니다.
goalInput.addEventListener('keypress', function (event) {
    // 만약 사용자가 누른 키(event.key)가 'Enter' 라면,
    if (event.key === 'Enter') {
        generateQuests(); // 퀘스트 생성 함수를 실행합니다.
    }
});

// 제미나이 AI에게 퀘스트를 만들어달라고 부탁하는 핵심 함수(명령어 모음)입니다.
// async(비동기)라는 말이 붙은 이유는, 인터넷에서 결과를 받아오는 동안 웹페이지가 멈추지 않게 기다려주기 위해서입니다.
async function generateQuests() {
    // 1. 사용자가 입력한 목표 내용을 가져옵니다. (앞뒤 공백은 trim()으로 잘라냅니다)
    const goal = goalInput.value.trim();

    // 입력칸이 비어있는지 확인합니다.
    if (goal === '') {
        // 비어있다면 경고창을 띄우고,
        alert('이루고 싶은 목표를 먼저 입력해주세요!');
        // 함수를 여기서 바로 끝내버립니다. (아래 코드는 더 이상 실행 안 됨)
        return;
    }

    // 만약 코드 상단에 API 키를 안 넣고 실행했다면 화면에 친절하게 안내 문구를 띄워줍니다.
    if (!API_KEY) {
        const userKey = prompt('앗! API 키가 설정되지 않았습니다. 다시 입력해 주세요:');
        if (userKey) {
            API_KEY = userKey.trim();
            localStorage.setItem('GEMINI_API_KEY', API_KEY);
            alert('API 키가 저장되었습니다. 다시 생성 버튼을 눌러주세요!');
        }
        return;
    }

    // 2. 새로운 퀘스트를 뽑기 전에, 화면 상태를 깔끔하게 준비합니다.
    // 기존에 있던 퀘스트 카드들을 화면에서 모두 지웁니다. 빈 문자열('')을 넣어 내용물을 텅 비웁니다.
    questContainer.innerHTML = '';

    // 로딩 화면이 보이도록 'hidden' 이라는 이름표(클래스)를 떼어냅니다. CSS에서 display: none이 풀리면서 화면에 나타납니다.
    loadingIndicator.classList.remove('hidden');

    // 퀘스트가 생성되는 동안 사용자가 버튼을 마구 또 누르지 못하게 버튼을 비활성화(disabled) 합니다.
    generateBtn.disabled = true;

    // 혹시라도 에러가 날 상황을 대비해 인터넷 통신 코드는 try-catch(시도해보고-에러잡기)로 안전하게 감쌉니다.
    try {
        // 제미나이 AI에게 보낼 프롬프트(명령어)를 만듭니다.
        // JSON 이라는 컴퓨터가 읽기 쉬운 깔끔한 데이터 형태로 대답하라고 매우 강하고 구체적으로 명령합니다.
        const promptText = `내 목표는 "${goal}"야. 이 목표를 향해 나아가기 위해 오늘 당장 실천할 수 있는 흥미로운 일일 퀘스트 3개를 만들어줘. \n반드시 아래와 같은 JSON 배열 형태로만 대답해줘. 마크다운 기호(\`\`\`json) 등은 절대 쓰지 마.\n[ { "title": "퀘스트 이름", "description": "재미있는 퀘스트 상세 설명", "difficulty": "쉬움" }, ... ]\n난이도는 "쉬움", "보통", "어려움" 중 하나로 적어줘.`;

        // 인터넷을 통해 구글 제미나이 최신 모델(gemini-2.5-flash)에게 요청을 보냅니다 (fetch 사용).
        // await는 "응답이 올 때까지 여기서 잠깐만 기다려!" 라는 뜻입니다.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            // 새 정보를 보내는 것이므로 POST 방식을 사용합니다.
            method: 'POST',
            // 우리가 보내는 데이터가 JSON 형식이라는 것을 알려줍니다. (편지봉투에 내용물이 뭔지 적어두는 것과 같습니다)
            headers: {
                'Content-Type': 'application/json'
            },
            // 제미나이가 알아들을 수 있는 규칙에 맞게 데이터를 포장(문자열로 변환)해서 보냅니다.
            body: JSON.stringify({
                "contents": [{
                    "parts": [{
                        "text": promptText // 아까 만든 명령어를 핵심 내용으로 담습니다.
                    }]
                }]
            })
        });

        // 돌아온 결과가 정상이 아니라면(통신 에러, API 키 오류 등),
        if (!response.ok) {
            // 강제로 에러를 폭발시켜서 아래의 catch 부분으로 도망치게 만듭니다.
            throw new Error(`서버 응답 에러: ${response.status}`);
        }

        // 제미나이가 보낸 답변 원본(JSON 형태)을 자바스크립트가 쓸 수 있게 변환해서 data에 담습니다.
        const data = await response.json();

        // 데이터 안쪽 깊숙한 곳에 제미나이가 진짜로 쓴 텍스트가 들어있습니다. 그것을 빼냅니다.
        let aiText = data.candidates[0].content.parts[0].text;

        // 제미나이가 가끔 눈치없이 마크다운 코드블럭(```json)으로 감싸서 대답할 때가 있으므로 지우개로 싹 지워줍니다.
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();

        // 텍스트(글자)로 표기된 JSON을 자바스크립트용 진짜 '배열' 객체로 완벽히 바꿔줍니다(컴퓨터가 해석합니다).
        const questList = JSON.parse(aiText);

        // 3. 받아온 퀘스트 3개를 화면에 예쁜 카드로 반복해서 그려냅니다. (forEach 구문 사용)
        // questList 안의 내용물 하나하나를 'quest'라고 부르며 순서대로 아래 코드를 반복 실행합니다.
        questList.forEach((quest, index) => {

            // 난이도 글씨에 따라 예쁜 색깔 배지를 붙이기 위해 CSS에서 쓸 영문 클래스 이름을 정해줍니다.
            let difficultyClass = "normal"; // 기본값은 '보통'
            if (quest.difficulty === "쉬움") difficultyClass = "easy"; // 내용이 '쉬움'이면 연두색 배지를 위해 easy로 변경
            if (quest.difficulty === "어려움") difficultyClass = "hard"; // 내용이 '어려움'이면 빨간색 배지를 위해 hard로 변경

            // html(화면 요소) 코드를 문자열로 직접 짭니다.
            // 위에서 우리가 정해둔 quest.title, quest.description 등이 빈 공간 안에 쏙쏙 들어갑니다.
            // style="animation-delay"를 index(순서)에 따라 곱해서 줘서, 카드가 0.15초 간격으로 첫째, 둘째, 셋째 순서대로 나타나게(차르륵~) 만듭니다.
            const cardHTML = `
                <div class="quest-card" style="animation-delay: ${index * 0.15}s">
                    <span class="badge ${difficultyClass}">${quest.difficulty}</span>
                    <h3>${quest.title}</h3>
                    <p>${quest.description}</p>
                </div>
            `;

            // 방금 만든 퀘스트 카드 1개 분량의 문자열 HTML을 커다란 퀘스트 상자(questContainer) 안쪽 맨 뒤에 하나씩 추가해 넣습니다.
            questContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (error) {
        // try 안에서 무언가 에러가 터졌다면 (인터넷 끊김, 데이터 변환 실패 등) 전부 중단하고 이쪽으로(catch) 옵니다.
        console.error("앗! 퀘스트 생성 중 에러가 났습니다:", error); // 개발자 도구(F12) 콘솔창에 진짜 에러 원인을 적어놓습니다.

        // 사용자가 알 수 있게 화면에 에러를 알려주는 빨간 카드를 띄워줍니다.
        questContainer.innerHTML = `
            <div class="quest-card" style="border-color: #e74c3c; animation-delay: 0s;">
                <h3 style="color: #e74c3c;">앗, 마법진에 문제가 생겼어요!</h3>
                <p>퀘스트를 불러오지 못했습니다. API 키가 정확한지, 인터넷이 연결되어 있는지 확인해보세요.</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">(상세 에러: ${error.message})</p>
            </div>
        `;
    } finally {
        // 성공을 했든(try의 끝), 앗 하고 실패했든(catch의 끝) 가장 "마지막(finally)"에 무조건 100% 실행되는 곳입니다. 뒷정리를 합니다.

        // 이제 다 끝났으니 보이던 로딩 화면을 다시 숨깁니다.
        loadingIndicator.classList.add('hidden');
        // 그리고 비활성화 해두었던 생성 버튼을 다시 클릭할 수 있게 살려냅니다.
        generateBtn.disabled = false;
        // 다음번 입력을 곧바로 편하게 할 수 있도록 현재 입력칸의 글씨를 전체 선택된 상태(블록 지정)로 만들어 줍니다.
        goalInput.select();
    }
}
