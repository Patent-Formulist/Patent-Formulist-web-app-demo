import HeroComp from '../components/HeroComp';
import AboutComp from '../components/AboutComp';
import FAQComp from '../components/FAQComp';
import ContactsComp from '../components/ContactsComp';

import styles from '../styles/Welcome.module.css';

function Welcome() {
  return (
    <div className={styles.page}>
      <HeroComp />
      <div id="about"><AboutComp /></div>
      <div id="faq"><FAQComp /></div>
      <div id="contacts"><ContactsComp /></div>
    </div>
  );
}

export default Welcome;