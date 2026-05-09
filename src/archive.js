function upload(pot) {
    // 화분을 데이터베이스에 맞는 형식으로 변환하기
}

function parse(data) {
    result = new Pot(어쩌고저쩌고);
    // 데이터베이스의 화분을 js 오브젝트로 변환하기
    return result;
}

function download() {
    // 데이터 다운로드하기

    let result = [];
    for (data of datas) {
        result.push(parse(data));
    }

    return result;
}