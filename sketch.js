// 게임 상태
const INTRO = 0; // 인트로
const CHOOSE_POT = 1; // 화분 선택
const POT_POPUP = 2; // 이미 만들어진 화분 보여주기
const POT_SETUP = 3; // 새 화분 특성 설정하기
const STEM_SETUP = 4; // 줄기 특성 설정하기
const DECORATE = 5; // 비즈를 꽂으며 화분 조립하기
const FINISH_STEM = 6; // 줄기 완성 후 확인
const SAVE = 7; // 저장 및 데이터베이스 업로드

let gameState = INTRO;

function setup() {

}

function draw() {
  switch (gameState) {
    case (INTRO):
      console.log("Hello");
      break;
    case (CHOOSE_POT):
      console.log("ㅁㄴㅇㄹ");
      break;
  }
}