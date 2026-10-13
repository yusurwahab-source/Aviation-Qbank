'use client';

import { useState } from 'react';

type Scenario = {
  phase: string;
  alt: string;
  oat: string;
  sky: 'day' | 'night' | 'storm' | 'fog';
  scenario: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

const scenarios: Scenario[] = [
  {
    phase: 'المرحلة 1: الاستعداد للإقلاع',
    alt: '0 ft', oat: '+28°C', sky: 'day',
    scenario: 'أنت على مدرج <span class="hl">مطار فينيكس</span> (1135 ft). الحرارة 28°C، الضغط 1013 hPa.',
    question: 'ماذا تتوقع بشأن مسافة الإقلاع؟',
    options: ['أقصر من المعتاد', 'أطول من المعتاد', 'لا تأثير', 'لا يمكن تحديده'],
    correct: 1,
    explanation: 'ISA عند 1135 ft = +12.7°C. الفرق = ISA +15°C. الكثافة أقل ← مسافة إقلاع أطول.',
  },
  {
    phase: 'المرحلة 2: الصعود',
    alt: '3500 ft', oat: '+10°C', sky: 'day',
    scenario: 'الحرارة تنخفض بمعدل <span class="hl">0.8°C/100 m</span>.',
    question: 'كيف تصف حالة الاستقرار الجوي؟',
    options: ['مستقر تماماً', 'غير مستقر تماماً', 'غير مستقر شرطياً', 'محايد'],
    correct: 2,
    explanation: 'ELR=0.8 بين SALR(0.6) و DALR(1.0) ← Conditional Instability.',
  },
  {
    phase: 'المرحلة 3: عبور جبهة باردة',
    alt: '5000 ft', oat: '+5°C', sky: 'storm',
    scenario: 'تقترب من <span class="hl">جبهة باردة نشطة</span>، السحب CB أمامك.',
    question: 'ما هو الإجراء الأسلم؟',
    options: ['الدخول مباشرة عبر الجبهة', 'التحليق فوق السحب', 'الالتفاف حول السحب بمسافة آمنة 20 NM', 'الهبوط فوراً'],
    correct: 2,
    explanation: 'CB يحتوي على اضطراب شديد، جليد، برَد، وإمكانية Microburst. الالتفاف إلزامي.',
  },
  {
    phase: 'المرحلة 4: دخول منطقة ضباب',
    alt: '1500 ft', oat: '+8°C', sky: 'fog',
    scenario: 'تهبط في مطار ساحلي، الضباب <span class="hl">Advection Fog</span> يغطي المدرج، الريح 5 kt.',
    question: 'ما الشرط الأساسي لتكوّن هذا النوع من الضباب؟',
    options: ['سماء صافية ورياح هادئة', 'هواء دافئ رطب يمر فوق سطح بارد', 'هواء بارد يمر فوق سطح دافئ', 'انعكاس حراري ليلي'],
    correct: 1,
    explanation: 'Advection Fog يحتاج: هواء دافئ رطب + سطح بارد + رياح خفيفة (2-15 kt).',
  },
  {
    phase: 'المرحلة 5: التسلق عبر طبقة باردة',
    alt: '8000 ft', oat: '-5°C', sky: 'day',
    scenario: 'تدخل سحابة <span class="hl">Nimbostratus</span> عند -5°C.',
    question: 'ما نوع الجليد المتوقع؟',
    options: ['جليد صافٍ (Clear Ice)', 'جليد ريم (Rime Ice)', 'لا يوجد جليد', 'جليد مختلط'],
    correct: 1,
    explanation: 'Nimbostratus يحتوي قطرات صغيرة ← Rime Ice خفيف إلى متوسط.',
  },
  {
    phase: 'المرحلة 6: الرياح العلوية',
    alt: '18000 ft', oat: '-21°C', sky: 'day',
    scenario: 'تطير شرقاً، الريح <span class="hl">270/80 kt</span>، الـ Jet Stream شمالك.',
    question: 'أين تتوقع CAT؟',
    options: ['في قلب الـ Jet Stream', 'على الجانب البارد (شمال) تحت القلب', 'على الجانب الدافئ (جنوب)', 'بعيداً جداً'],
    correct: 1,
    explanation: 'CAT أشد على الجانب البارد للـ Jet Stream، تحت القلب مباشرة.',
  },
  {
    phase: 'المرحلة 7: تضاريس جبلية',
    alt: '1500 ft', oat: '+12°C', sky: 'day',
    scenario: 'تطير فوق جبال بارتفاع 2000 ft، الريح <span class="hl">عمودية على السلسلة 25 kt</span>.',
    question: 'ما هي السحابة المميزة التي تدل على Mountain Waves؟',
    options: ['Cumulus', 'Lenticular', 'Stratus', 'Cirrus'],
    correct: 1,
    explanation: 'Lenticular clouds (عدسية الشكل) هي العلامة المميزة لـ Mountain Waves.',
  },
  {
    phase: 'المرحلة 8: الهبوط في مطار مرتفع',
    alt: '4000 ft', oat: '+30°C', sky: 'day',
    scenario: 'مطار <span class="hl">Denver</span> (5434 ft)، الحرارة 30°C.',
    question: 'كيف يؤثر هذا على أداء الطائرة؟',
    options: ['أداء أفضل بسبب الارتفاع', 'أداء أسوأ بسبب انخفاض الكثافة', 'لا تأثير', 'يتحسن التسارع'],
    correct: 1,
    explanation: 'ارتفاع + حرارة = كثافة أقل ← رفع أقل، مسافة إقلاع أطول، تسلق أبطأ.',
  },
  {
    phase: 'المرحلة 9: عاصفة رعدية',
    alt: '6000 ft', oat: '+18°C', sky: 'storm',
    scenario: 'ترى <span class="hl">Cumulonimbus</span> أمامك مع Microburst.',
    question: 'ما العلامة التي تدل على Microburst؟',
    options: ['Virga تحت السحابة', 'قوس قزح', 'رياح هادئة', 'سحب عالية'],
    correct: 0,
    explanation: 'Virga (أمطار لا تصل للأرض) علامة على Microburst خطير قادم.',
  },
  {
    phase: 'المرحلة 10: التقرير النهائي',
    alt: '0 ft', oat: '+15°C', sky: 'day',
    scenario: 'بعد الرحلة، تراجع الأحوال الجوية. درجة الحرارة الثابتة فوق 11 km في ISA.',
    question: 'ما قيمة هذه الحرارة؟',
    options: ['-40°C', '-56.5°C', '-75°C', '-80°C'],
    correct: 1,
    explanation: 'في ISA، درجة الحرارة الثابتة من 11 km إلى 20 km = -56.5°C.',
  },
];

export default function WeatherSimPage() {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const s = scenarios[current];
  const answered = selected !== null;

  const handleChoose = (i: number) => {
    if (answered) return;
    setSelected(i);
    if (i === s.correct) setScore((prev) => prev + 10);
  };

  const handleNext = () => {
    if (current < scenarios.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
  };

  const isCorrect = answered && selected === s.correct;
  const progress = ((current + (answered ? 1 : 0)) / scenarios.length) * 100;

  const skyClass =
    s.sky === 'night' ? 'skyNight' :
    s.sky === 'storm' ? 'skyStorm' :
    s.sky === 'fog'   ? 'skyFog'   : 'skyDay';

  const rankText = () => {
    if (score >= 90) return '🏆 كابتن طيار ممتاز!';
    if (score >= 70) return '✈️ طيار ماهر';
    if (score >= 50) return '📘 تحتاج مراجعة';
    return '🔄 أعد التدريب';
  };

  return (
    <div className="simWrapper">
      <style jsx>{`
        .simWrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 15px;
          background: linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0f1e35 100%);
          font-family: 'Segoe UI', Tahoma, sans-serif;
          color: #e8f0ff;
        }
        .container {
          max-width: 500px;
          width: 100%;
          background: rgba(15, 30, 53, 0.95);
          border: 2px solid #2a4a7a;
          border-radius: 16px;
          box-shadow: 0 0 40px rgba(50, 120, 200, 0.3);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(90deg, #1e3a5f, #2a4a7a);
          padding: 15px;
          text-align: center;
          border-bottom: 2px solid #3a5a8a;
        }
        .header h1 { font-size: 20px; color: #7fc4ff; margin: 0; }
        .header p { font-size: 12px; color: #a8c4e8; margin-top: 4px; }
        .sky {
          position: relative;
          height: 140px;
          overflow: hidden;
          transition: background 1s;
        }
        .skyDay   { background: linear-gradient(180deg, #4a7ab5, #6ba3d4 60%, #a8d0f0); }
        .skyNight { background: linear-gradient(180deg, #0a1a3a, #1a2a5a 60%, #3a4a7a); }
        .skyStorm { background: linear-gradient(180deg, #2a2a3a, #4a4a5a 60%, #6a6a7a); }
        .skyFog   { background: linear-gradient(180deg, #8a9aaa, #b0bcc8 60%, #d0d8e0); }
        .sun {
          position: absolute;
          top: 15px; right: 25px;
          width: 40px; height: 40px;
          background: radial-gradient(circle, #fff8a0, #ffcc44);
          border-radius: 50%;
          box-shadow: 0 0 30px #ffcc44;
        }
        .cloud {
          position: absolute;
          background: rgba(255,255,255,0.85);
          border-radius: 50%;
        }
        .cloud::before, .cloud::after {
          content: ''; position: absolute;
          background: inherit; border-radius: 50%;
        }
        .c1 { width: 60px; height: 25px; top: 40px; animation: drift 25s linear infinite; }
        .c1::before { width: 35px; height: 35px; top: -15px; left: 10px; }
        .c1::after  { width: 30px; height: 30px; top: -12px; left: 30px; }
        .c2 { width: 80px; height: 30px; top: 70px; animation: drift 40s linear infinite; animation-delay: -10s; }
        .c2::before { width: 45px; height: 45px; top: -20px; left: 15px; }
        .c2::after  { width: 40px; height: 40px; top: -18px; left: 40px; }
        @keyframes drift { from { left: -150px; } to { left: 110%; } }
        .plane {
          position: absolute;
          bottom: 20px; left: 50%;
          transform: translateX(-50%);
          font-size: 40px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
          animation: bob 2s ease-in-out infinite;
        }
        @keyframes bob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-6px); }
        }
        .planeShake { animation: shake 0.4s infinite; }
        @keyframes shake {
          0%, 100% { transform: translateX(-50%) rotate(-3deg); }
          50%      { transform: translateX(-50%) rotate(3deg); }
        }
        .hud {
          display: flex;
          justify-content: space-around;
          background: rgba(10, 22, 40, 0.9);
          padding: 10px;
          border-bottom: 1px solid #2a4a7a;
          font-size: 13px;
        }
        .hudItem { text-align: center; }
        .hudLabel { color: #7a9ac4; font-size: 10px; }
        .hudValue { color: #7fc4ff; font-weight: bold; font-size: 16px; }
        .hudWarn { color: #ffaa44; }
        .progressBar { height: 4px; background: #1a2a4a; overflow: hidden; }
        .progressFill {
          height: 100%;
          background: linear-gradient(90deg, #4a8ac4, #7fc4ff);
          transition: width 0.4s;
        }
        .content { padding: 20px; }
        .phase { font-size: 11px; color: #7a9ac4; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
        .scenario { font-size: 15px; line-height: 1.6; margin-bottom: 15px; color: #d0e0f8; }
        .scenario :global(.hl) { color: #ffcc44; font-weight: bold; }
        .question {
          background: rgba(30, 58, 95, 0.5);
          border-right: 3px solid #4a8ac4;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 14px;
          font-weight: bold;
          color: #a8d0ff;
        }
        .options { display: flex; flex-direction: column; gap: 10px; }
        .option {
          background: rgba(30, 58, 95, 0.7);
          border: 2px solid #3a5a8a;
          color: #e8f0ff;
          padding: 14px;
          border-radius: 10px;
          font-size: 14px;
          text-align: right;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          width: 100%;
        }
        .option:hover:not(:disabled) {
          background: rgba(50, 90, 140, 0.8);
          border-color: #5a9ade;
        }
        .option:disabled { cursor: default; opacity: 0.85; }
        .optCorrect { background: rgba(40, 120, 60, 0.9); border-color: #4ade80; }
        .optWrong   { background: rgba(140, 40, 40, 0.9); border-color: #ff5555; }
        .feedback {
          margin-top: 15px;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.6;
        }
        .fbCorrect { background: rgba(40, 120, 60, 0.3); border: 1px solid #4ade80; color: #b0ffcc; }
        .fbWrong   { background: rgba(140, 40, 40, 0.3); border: 1px solid #ff5555; color: #ffcccc; }
        .btnNext {
          width: 100%;
          margin-top: 15px;
          padding: 14px;
          background: linear-gradient(90deg, #2a6ab5, #4a9ade);
          border: none;
          color: white;
          font-size: 16px;
          font-weight: bold;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
        }
        .btnNext:hover { background: linear-gradient(90deg, #3a7ac5, #5aaaee); }
        .gameOver { text-align: center; padding: 20px; }
        .gameOver h2 { color: #7fc4ff; margin-bottom: 15px; font-size: 22px; }
        .finalScore { font-size: 48px; color: #ffcc44; font-weight: bold; margin: 15px 0; }
        .rank { font-size: 18px; color: #a8d0ff; margin-bottom: 20px; }
        .btnRestart {
          padding: 14px 30px;
          background: linear-gradient(90deg, #2a6ab5, #4a9ade);
          border: none;
          color: white;
          font-size: 16px;
          font-weight: bold;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
        }
      `}</style>

      <div className="container">
        <div className="header">
          <h1>✈️ Weather Flight Simulator</h1>
          <p>Cessna 152 — رحلة عبر الطقس</p>
        </div>

        <div className={`sky ${skyClass}`}>
          {s.sky === 'day' && <div className="sun" />}
          <div className="cloud c1" />
          <div className="cloud c2" />
          <div className={`plane ${s.sky === 'storm' ? 'planeShake' : ''}`}>✈️</div>
        </div>

        <div className="hud">
          <div className="hudItem"><div className="hudLabel">SCORE</div><div className="hudValue">{score}</div></div>
          <div className="hudItem"><div className="hudLabel">FLIGHT</div><div className="hudValue">{current + 1}/{scenarios.length}</div></div>
          <div className="hudItem"><div className="hudLabel">ALT</div><div className="hudValue">{s.alt}</div></div>
          <div className="hudItem">
            <div className="hudLabel">OAT</div>
            <div className={`hudValue ${s.sky === 'storm' ? 'hudWarn' : ''}`}>{s.oat}</div>
          </div>
        </div>

        <div className="progressBar">
          <div className="progressFill" style={{ width: `${progress}%` }} />
        </div>

        {!finished ? (
          <div className="content">
            <div className="phase">{s.phase}</div>
            <div className="scenario" dangerouslySetInnerHTML={{ __html: s.scenario }} />
            <div className="question">{s.question}</div>
            <div className="options">
              {s.options.map((opt, i) => {
                let cls = 'option';
                if (answered) {
                  if (i === s.correct) cls += ' optCorrect';
                  else if (i === selected) cls += ' optWrong';
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => handleChoose(i)}
                    disabled={answered}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={`feedback ${isCorrect ? 'fbCorrect' : 'fbWrong'}`}>
                {isCorrect ? '✅ صحيح! ' : '❌ خطأ. الإجابة الصحيحة: ' + s.options[s.correct] + '. '}
                <br />
                {s.explanation}
              </div>
            )}

            {answered && (
              <button className="btnNext" onClick={handleNext}>
                {current < scenarios.length - 1 ? 'الرحلة التالية ✈️' : 'عرض النتيجة 🏁'}
              </button>
            )}
          </div>
        ) : (
          <div className="gameOver">
            <h2>🛬 انتهت الرحلة</h2>
            <div className="finalScore">{score} / {scenarios.length * 10}</div>
            <div className="rank">{rankText()}</div>
            <button className="btnRestart" onClick={handleRestart}>🔄 رحلة جديدة</button>
          </div>
        )}
      </div>
    </div>
  );
}