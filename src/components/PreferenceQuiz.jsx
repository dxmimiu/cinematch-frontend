import React, { useState } from 'react';

export default function PreferenceQuiz({ onComplete }) {
  const questionsData = {
    level1: {
      id: 1,
      question: "ได้หยุดพักผ่อนสั้นๆ เสาร์-อาทิตย์ สิ่งแรกที่คุณจะทำคือ...",
      options: [
        "หาที่เที่ยวไกลๆ หรือลองไปคาเฟ่ ร้านใหม่ๆ",
        "เสพงานศิลป์ ไปนิทรรศการ หรือเดินมิวเซียมเงียบๆ",
        "นอนตื่นสาย สั่งของกินมากิน ดูคลิปเพลินๆ",
        "นั่งหน้าคอม เล่นเกมจำลองชีวิต ทำกิจกรรมคราฟต์เพลินๆ"
      ]
    },
    level2Active: {
      id: 2,
      question: "ออกมาซะข้างนอกแล้วฝนตกหนัก/รถติดจนแผนรวน คุณจะ...",
      options: [
        "เปลี่ยนแผน ดันสดหาที่ไปแถวนั้นแทน",
        "หาที่นั่งหลบ เช็กแผนที่ประเมินสถานการณ์ก่อน",
        "ช่างมัน! หาร้านของหวานอร่อยๆ นั่งกินรอฝนซา",
        "นั่งมองฝนตก ถ่ายสตอรี่ใส่เพลงเศร้าๆ อินกับบรรยากาศ"
      ]
    },
    level2Passive: {
      id: 2,
      question: "เวลาไถโซเชียลเพลินๆ คอนเทนต์แบบไหนที่คุณมักจะหยุดดูนานที่สุด?",
      options: [
        "คลิปเรื่องลี้ลับ ทฤษฎีสมคบคิด เทคโนโลยี",
        "Vlog ชีวิตคนอื่น รีวิวของ เล่าเรื่องดราม่า",
        "คลิปเล่าคดีฆาตกรรมปริศนา หรือเรื่องผีสยองขวัญ",
        "คลิปหมาแมว สัตว์โลกน่ารัก หรือคลิปแกล้งคนตลกๆ"
      ]
    },
    level3: {
      id: 3,
      question: "เวลาเพื่อนสนิททักมาปรึกษาปัญหาชีวิต ปฏิกิริยาแรกของคุณคือ...",
      options: [
        "ถามหาต้นเหตุ แล้วช่วยหาวิธีแก้ทีละสเตป",
        "รับฟังเงียบๆ ปล่อยให้เพื่อนได้ระบายเต็มที่",
        "ชวนคุยเรื่องตลกๆ หรือหาไปหาอะไรกินให้ลืม",
        "ตั้งสติ แชร์มุมมองความเป็นจริงที่โหดร้ายแต่ต้องยอมรับ"
      ]
    },
    level4: {
      id: 4,
      question: "เวลาต้องจัดห้องชุดใหญ่ หรือเคลียร์งานกองโต สไตล์ของคุณคือ...",
      options: [
        "ฮึดทำทีเดียวให้เสร็จไปเลย เหนื่อยแต่จบไว",
        "ทยอยทำทีละโซน ทำๆ พักๆ ค่อยเป็นค่อยไป",
        "ทำแป๊บเดียวเบื่อ ขอไปหาอะไรสั้นๆ ดูก่อนแล้วค่อยกลับมาทำ"
      ]
    },
    level5: {
      id: 5,
      question: "เวลาฟังเพื่อนอัปเดตชีวิตกับกลุ่มเพื่อน คุณชอบให้บทสนทนาจบลงแบบไหน?",
      options: [
        "ได้ข้อสรุปชัดเจน เคลียร์ทุกประเด็นที่สงสัย",
        "เป็นหัวข้อปลายเปิด ทิ้งให้เอาไปคิดต่อสนุกๆ",
        "ได้แชร์ประสบการณ์ตรง ยอมรับความจริงของชีวิต",
        "หักมุมช็อตฟีล คดีพลิกแบบที่ไม่มีใครเดาทางถูก"
      ]
    }
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const getCurrentQuestion = () => {
    if (currentStep === 1) return questionsData.level1;
    if (currentStep === 2) {
      const answerLevel1 = selectedAnswers[1];
      if (answerLevel1 === "นอนตื่นสาย สั่งของกินมากิน ดูคลิปเพลินๆ" || answerLevel1 === "นั่งหน้าคอม เล่นเกมจำลองชีวิต ทำกิจกรรมคราฟต์เพลินๆ") {
        return questionsData.level2Passive;
      } else {
        return questionsData.level2Active;
      }
    }
    if (currentStep === 3) return questionsData.level3;
    if (currentStep === 4) return questionsData.level4;
    if (currentStep === 5) return questionsData.level5;
  };

  const handleOptionClick = (optionText) => {
    const newAnswers = { ...selectedAnswers, [currentStep]: optionText };
    setSelectedAnswers(newAnswers);

    setTimeout(() => {
      if (currentStep < 5) {
        setCurrentStep(prev => prev + 1);
      } else {
        onComplete(newAnswers);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentQ = getCurrentQuestion();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9]">
      
      <header className="w-full bg-white px-8 py-5 shadow-[0_2px_10px_rgba(33,1,0,0.02)] border-b border-[#FECE79]/30 flex items-center justify-center relative">
        {currentStep > 1 && (
          <button 
            onClick={handleBack}
            className="absolute left-6 md:left-10 flex items-center gap-2 text-[#B14A36] hover:text-[#8C0902] font-bold text-sm transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span className="hidden sm:inline">ย้อนกลับ</span>
          </button>
        )}

        <div className="font-black text-xl md:text-2xl tracking-widest text-[#8C0902]">
          CINEMATCH
        </div>
      </header>

      <main className="grow flex flex-col items-center justify-center px-6 w-full animate-fade-in pb-20">
        <div className="max-w-4xl w-full flex flex-col items-center">
          
          <div className="text-[#B14A36] font-bold text-sm mb-5 tracking-widest uppercase">
            Level {currentStep} / 5
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-[#210100] mb-12 text-center max-w-3xl leading-snug tracking-tight">
            {currentQ.question}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswers[currentStep] === option;
              
              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  className={`
                    py-5 px-6 rounded-2xl text-sm font-semibold border-2 transition-all duration-200 text-center flex items-center justify-center min-h-20
                    ${isSelected 
                      ? 'border-[#E6A341] bg-[#FECE79]/30 text-[#210100] scale-[0.98] shadow-inner' 
                      : 'border-gray-100 bg-white text-[#210100] hover:border-[#E6A341] hover:bg-[#FFFDF9] hover:shadow-[0_4px_20px_rgba(230,163,65,0.15)] hover:-translate-y-1'}
                    ${currentStep === 4 && index === 2 ? 'md:col-span-2' : ''}
                  `}
                >
                  {option}
                </button>
              );
            })}
          </div>

        </div>
      </main>

    </div>
  );
}