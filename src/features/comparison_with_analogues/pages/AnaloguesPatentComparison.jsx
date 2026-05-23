import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import { API_PROCESSOR_ENDPOINTS } from '../../../services/apiConfig'
import * as XLSX from 'xlsx'
import styles from '../styles/AnaloguesPatentComparison.module.css'
import authService from "../../../services/auth/authService.js";
import { SkeletonTable } from '../../../components/Skeleton/SkeletonTable'

// 🔹 НАСТРОЙКИ ОТЛАДКИ
const DEBUG = true;
const MODULE = 'Comparison';

const log = (label, data) => {
  if (!DEBUG) return;
  console.log(`[${new Date().toLocaleTimeString()}] [${MODULE}] ${label}`, data !== undefined ? data : '');
};

const logGroup = (label, callback) => {
  if (!DEBUG) return callback();
  console.group(`[${new Date().toLocaleTimeString()}] [${MODULE}] ${label}`);
  const result = callback();
  console.groupEnd();
  return result;
};

const TABLE_HEADERS = {
  mainRow: {
    features: 'Признаки',
    analogs: 'Аналоги',
    frequency: 'Частота встречаемости',
    userComparison: 'Сравнение с пользовательским'
  },
  subRow: { userPatent: 'Ваш патент' }
};

const downloadExcel = (data, patentId) => {
  if (!data?.features || !data?.analogs) throw new Error('Неверный формат данных');
  const { features, analogs, comparison, frequency, user_patent, user_comparison, analog_counts } = data;
  
  const headerRow1 = [
    TABLE_HEADERS.mainRow.features,
    ...Array(analogs.length).fill(TABLE_HEADERS.mainRow.analogs),
    TABLE_HEADERS.mainRow.frequency,
    TABLE_HEADERS.mainRow.userComparison,
    ...Array(analogs.length).fill(TABLE_HEADERS.mainRow.userComparison)
  ];
  const headerRow2 = ['', ...analogs, '', TABLE_HEADERS.subRow.userPatent, ...analogs];
  const rows = features.map((feature, idx) => [
    feature,
    ...comparison[idx],
    frequency[idx],
    user_patent[idx],
    ...user_comparison[idx]
  ]);
  rows.push(['Итого', ...Array(analogs.length).fill(''), '', '', ...analog_counts]);

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...rows]);
  worksheet['!cols'] = [
    { wch: 60 },
    ...analogs.map(() => ({ wch: 15 })),
    { wch: 25 },
    { wch: 20 },
    ...analogs.map(() => ({ wch: 15 }))
  ];
  
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: analogs.length } }
  ];
  const frequencyCol = analogs.length + 1;
  merges.push({ s: { r: 0, c: frequencyCol }, e: { r: 1, c: frequencyCol } });
  const userStartCol = frequencyCol + 1;
  merges.push({ s: { r: 0, c: userStartCol }, e: { r: 0, c: userStartCol + analogs.length } });
  
  worksheet['!merges'] = merges;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Сопоставление');
  XLSX.writeFile(workbook, `comparison_${patentId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export default function AnaloguesPatentComparison() {
  const { id } = useParams();
  const { startCompareTask, getCompareTask, getTask } = useReference();
  const { showWarning, showSuccess, showError } = useToast();

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [prevStatus, setPrevStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const analogTask = getTask(id);
  const task = getCompareTask(id);
  const comparisonData = task?.data;

  // 🔹 Безопасное извлечение данных (учитываем строковый и числовой ключ)
  const idStr = String(id);
  const idNum = Number(id);
  const patentData = comparisonData?.[idStr] || comparisonData?.[idNum] || comparisonData;

  // 🔹 Проверка валидности данных
  const hasValidData = patentData?.features?.length > 0 && patentData?.analogs?.length > 0;
  const isCompleted = task?.status === TASK_STATUS.SUCCESS && hasValidData;
  const isAnalogCompleted = analogTask?.status === TASK_STATUS.SUCCESS;
  const isLoading = isSubmitting || task?.status === TASK_STATUS.RUNNING;

  // 🔹 Отладка структуры данных
  useEffect(() => {
    if (comparisonData && DEBUG) {
      console.table({
        'task.status': task?.status,
        'id (string)': idStr,
        'topLevelKeys': Object.keys(comparisonData),
        'patentDataFound': !!patentData,
        'patentDataKeys': patentData ? Object.keys(patentData) : null,
        'featuresLen': patentData?.features?.length || 0,
        'analogsLen': patentData?.analogs?.length || 0
      });
    }
  }, [comparisonData, id, task?.status, patentData, idStr]);

  // 🔹 Лог монтирования
  useEffect(() => {
    logGroup('🚨 МОНТИРОВАНИЕ', () => {
      log('ID', id);
      log('Статус задачи', task?.status);
      log('isCompleted', isCompleted);
      log('hasValidData', hasValidData);
      log('Аналоги завершены', isAnalogCompleted);
    });
  }, []);

  // 🔹 Обработка смены статуса
  useEffect(() => {
    if (task?.status !== prevStatus) {
      if (task?.status === TASK_STATUS.SUCCESS && hasValidData) {
        showSuccess('Сопоставление выполнено');
      } else if (task?.status === TASK_STATUS.FAILED) {
        showError(task?.error || 'Ошибка сопоставления');
      }
      setPrevStatus(task?.status);
    }
  }, [task?.status, task?.error, prevStatus, hasValidData, showSuccess, showError]);

  // 🔹 Сброс флага загрузки
  useEffect(() => {
    if (task?.status === TASK_STATUS.SUCCESS || task?.status === TASK_STATUS.FAILED) {
      setIsSubmitting(false);
    }
  }, [task?.status]);

  // 🔹 Запуск сопоставления
  const handleCompare = async () => {
    if (!isAnalogCompleted) {
      showWarning('Сначала выполните поиск аналогов');
      return;
    }
    if (isCompleted) {
      setConfirmModalVisible(true);
      return;
    }

    setIsSubmitting(true); // 🔹 Включаем скелетон ДО вызова
    try {
      await startCompareTask(id);
    } catch (err) {
      showError(err.message || 'Ошибка запуска');
      setIsSubmitting(false);
    }
  };

  // 🔹 Повторный запуск — ИСПРАВЛЕНО: теперь включает анимацию
  const confirmRestart = async () => {
    setConfirmModalVisible(false);
    setIsSubmitting(true); // 🔹 КЛЮЧЕВОЕ: включаем загрузку перед запросом
    try {
      await startCompareTask(id);
    } catch (err) {
      showError(err.message || 'Ошибка запуска');
      setIsSubmitting(false);
    }
  };

  const cancelRestart = () => setConfirmModalVisible(false);

  // 🔹 Скачивание
  const handleDownload = () => {
    if (!isCompleted) {
      showWarning('Сначала выполните сопоставление');
      return;
    }
    try {
      downloadExcel(patentData, id);
      showSuccess('Таблица скачана');
    } catch (err) {
      showError('Ошибка скачивания');
    }
  };

  // 🔹 Рендер таблицы
  const renderComparisonTable = () => {
    if (!hasValidData) {
      return (
        <div className={styles.emptyState}>
          <p>Результаты сопоставления пока не сформированы</p>
          <button className={styles.retryButton} onClick={handleCompare}>Попробовать снова</button>
        </div>
      );
    }

    const { features, analogs, comparison, frequency, user_patent, user_comparison, analog_counts } = patentData;

    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th rowSpan="2" className={styles.featureHeader}>{TABLE_HEADERS.mainRow.features}</th>
                <th colSpan={analogs.length} className={styles.sectionHeader}>{TABLE_HEADERS.mainRow.analogs}</th>
                <th rowSpan="2">{TABLE_HEADERS.mainRow.frequency}</th>
                <th colSpan={analogs.length + 1} className={styles.sectionHeader}>{TABLE_HEADERS.mainRow.userComparison}</th>
              </tr>
              <tr>
                {analogs.map((analog, idx) => <th key={idx}>{analog}</th>)}
                <th>{TABLE_HEADERS.subRow.userPatent}</th>
                {analogs.map((analog, idx) => <th key={`user-${idx}`}>{analog}</th>)}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, featureIdx) => (
                <tr key={featureIdx}>
                  <td className={styles.featureCell}>{feature}</td>
                  {comparison[featureIdx].map((value, analogIdx) => (
                    <td key={analogIdx} className={styles.valueCell}>{value}</td>
                  ))}
                  <td className={styles.frequencyCell}>{frequency[featureIdx]}</td>
                  <td className={styles.valueCell}>{user_patent[featureIdx]}</td>
                  {user_comparison[featureIdx].map((value, analogIdx) => (
                    <td key={`user-comp-${analogIdx}`} className={styles.valueCell}>{value}</td>
                  ))}
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td className={styles.totalLabel}>Итого</td>
                {analogs.map((_, idx) => <td key={`empty-${idx}`}></td>)}
                <td></td><td></td>
                {analog_counts.map((count, idx) => (
                  <td key={`total-${idx}`} className={styles.totalCell}>{count}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.buttonContainer}>
          <button 
            className={`${styles.actionButton} ${isLoading ? styles.loading : ''} ${isCompleted && !isLoading ? styles.completed : ''}`}
            onClick={handleCompare}
            disabled={isLoading || !isAnalogCompleted}
          >
            Сопоставить патент с аналогами
          </button>
          <button
            className={`${styles.actionButton} ${!isCompleted ? styles.inactive : ''}`}
            onClick={handleDownload}
            disabled={!isCompleted}
          >
            Скачать таблицу сопоставления
          </button>
        </div>

        {/* 🔹 Скелетон при загрузке */}
        {isLoading && <SkeletonTable />}

        {/* 🔹 Таблица только при успехе и валидных данных */}
        {isCompleted && !isLoading && renderComparisonTable()}

        {/* 🔹 Подсказка, если задача завершена, но данных нет */}
        {task?.status === TASK_STATUS.SUCCESS && !hasValidData && !isLoading && (
          <div className={styles.emptyState}>
            <p>Результаты сопоставления пока не сформированы</p>
            <button className={styles.retryButton} onClick={handleCompare}>Попробовать снова</button>
          </div>
        )}
      </div>

      {confirmModalVisible && createPortal(
        <div className={styles.modalOverlay} onClick={cancelRestart}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Повторное сопоставление?</h3>
            <p className={styles.modalText}>Вы уверены, что хотите выполнить повторное сопоставление?</p>
            <p className={styles.modalWarning}>Данные следующих шагов станут неактуальными.</p>
            <div className={styles.modalButtons}>
              <button className={styles.modalCancelButton} onClick={cancelRestart} type="button">Отмена</button>
              <button className={styles.modalConfirmButton} onClick={confirmRestart} type="button">Продолжить</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}