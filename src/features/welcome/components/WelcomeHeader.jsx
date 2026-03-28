import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../../services/auth/authService';

import logo from '../../../resources/logo.svg';
import funcsIcon from '../../../resources/funcs.svg';

import styles from '../styles/WelcomeHeader.module.css';

function WelcomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isValid = await authService.validate();
        setIsAuthenticated(isValid);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleAnchorClick = (e, sectionId) => {
    e.preventDefault();
    
    if (sectionId === 'about') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      closeMenu();
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      closeMenu();
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logoLink} onClick={closeMenu}>
          <img src={logo} alt="Логотип" className={styles.logo} />
        </Link>

        <nav className={`${styles.navLinks} ${menuOpen ? styles.open : ''}`}>
          <a href="#about" onClick={(e) => handleAnchorClick(e, 'about')}>О нас</a>
          <a href="#faq" onClick={(e) => handleAnchorClick(e, 'faq')}>Частые вопросы</a>
          <a href="#contacts" onClick={(e) => handleAnchorClick(e, 'contacts')}>Контакты</a>
          
          <div className={styles.mobileAuthButtons}>
            {isAuthenticated ? (
              <Link to="/workspace" className={styles.mobileRegisterBtn} onClick={closeMenu}>
                К работе
              </Link>
            ) : (
              <>
                <Link to="/signin" className={styles.mobileRegisterBtn} onClick={closeMenu}>
                  Регистрация
                </Link>
                <Link to="/login" className={styles.mobileLoginBtn} onClick={closeMenu}>
                  Войти
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className={styles.authButtons}>
          {isAuthenticated ? (
            <Link to="/workspace" className={styles.registerBtn} onClick={closeMenu}>
              К работе
            </Link>
          ) : (
            <>
              <Link to="/signin" className={styles.registerBtn} onClick={closeMenu}>
                Регистрация
              </Link>
              <Link to="/login" className={styles.loginBtn} onClick={closeMenu}>
                Войти
              </Link>
            </>
          )}
        </div>

        <button 
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <img src={funcsIcon} alt="Меню" className={styles.menuIcon} />
        </button>
      </div>
    </header>
  );
}

export default WelcomeHeader;