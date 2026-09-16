export function getMongnaAnniversaries() {
  // 💡 여기서 몽나님의 진짜 데뷔일과 생일을 적어주세요!
  const debutDate = new Date('2023-11-18T00:00:00'); 
  const birthdayMonth = 3; // 11월
  const birthdayDay = 5;   // 15일

  const today = new Date();
  
  // 1. 데뷔 D+ 계산 (오늘 포함 1일)
  const diffTime = today.getTime() - debutDate.getTime();
  const debutDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // 2. 생일 D- 계산
  const currentYear = today.getFullYear();
  let nextBirthday = new Date(currentYear, birthdayMonth - 1, birthdayDay);
  
  // 올해 생일이 지났다면 내년 생일로 세팅
  if (today.getTime() > nextBirthday.getTime() + (1000 * 60 * 60 * 24)) {
    nextBirthday = new Date(currentYear + 1, birthdayMonth - 1, birthdayDay);
  }
  
  const birthDiffTime = nextBirthday.getTime() - today.getTime();
  const birthDDay = Math.ceil(birthDiffTime / (1000 * 60 * 60 * 24));

  // 3. 오늘이 당일인지 체크 (홈 화면용)
  const isBirthdayToday = today.getMonth() + 1 === birthdayMonth && today.getDate() === birthdayDay;
  const isDebutToday = today.getMonth() + 1 === debutDate.getMonth() + 1 && today.getDate() === debutDate.getDate();

  return { debutDays, birthDDay, isBirthdayToday, isDebutToday };
}
