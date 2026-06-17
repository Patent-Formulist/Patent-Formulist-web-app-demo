import { useState } from 'react';

import arrow from '../../../resources/arrow.svg';

import styles from "../styles/FAQComp.module.css";

function FAQComp() {
  const [openIndexes, setOpenIndexes] = useState([]);

  const faqs = [
    {
      question: 'Как работает проверка уникальности?',
      answer: 'Наша система анализирует патентные базы данных и выявляет аналоги вашей идеи, используя искусственный интеллект и алгоритмы сравнения.'
    },
    {
      question: 'Сколько времени занимает анализ?',
      answer: 'Обычно проверка занимает от 2 до 5 минут в зависимости от сложности идеи и количества аналогов в базе данных.'
    },
    {
      question: 'Какие документы нужны для проверки?',
      answer: 'Достаточно описания вашей идеи. Дополнительно можно приложить чертежи, схемы или прототипы для более точного анализа.'
    },
    {
      question: 'Как формируется патентная формула?',
      answer: 'На основе анализа аналогов и выявленных отличий наша система генерирует структурированную патентную формулу, соответствующую требованиям патентного законодательства.'
    },
    {
      question: 'Какие источники патентных данных используются?',
      answer: 'Мы используемы базу данных Роспатента.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndexes(prevIndexes => {
      if (prevIndexes.includes(index)) {
        return prevIndexes.filter(i => i !== index)
      } else {
        return [...prevIndexes, index]
      }
    })
  };
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>Частые вопросы</h2>
        
        <div className={styles.list}>
          {faqs.map((faq, index) => (
            <div key={index} className={styles.item}>
              <button 
                className={`${styles.question} ${openIndexes.includes(index) ? styles.active : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <span>{faq.question}</span>

                <img 
                  src={arrow} 
                  alt="Стрелка" 
                  className={`${styles.arrow} ${openIndexes.includes(index) ? styles.rotated : ''}`}
                />
              </button>
              
              <div className={`${styles.answer} ${openIndexes.includes(index) ? styles.open : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQComp;