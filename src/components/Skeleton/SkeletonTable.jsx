import styles from './SkeletonTable.module.css'

export function SkeletonTable({ rows = 20, columns = 5 }) {
  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableContainer}>
        {/* Анимация на всю таблицу */}
        <div className={styles.skeletonOverlay} />
        
        <table className={styles.table}>
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, idx) => (
                <th key={idx}>
                  <div className={styles.skeletonHeaderCell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx}>
                    <div className={styles.skeletonCell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}