import { Routes, Route } from 'react-router-dom'

import { PatentsProvider } from './contexts/PatentsContext'
import { ReferenceProvider } from './contexts/ReferenceContext'
import { ToastProvider } from './contexts/ToastContext'

import AuthorizedUserRoute from './routes/AuthorizedUserRoute'

import WelcomeLayout from './layouts/welcome/WelcomeLayout'
import WorkspaceLayout from './layouts/workspace/WorkspaceLayout'
import ReferenceLayout from './layouts/reference/ReferenceLayout'
import ProfileLayout from './layouts/profile/ProfileLayout'

import Welcome from './features/welcome/pages/Welcome'
import About from './features/welcome/pages/About'
import FAQ from './features/welcome/pages/FAQ'
import Contacts from './features/welcome/pages/Contacts'

import LogIn from './features/auth/pages/LogIn'
import SignIn from './features/auth/pages/SignIn'

import WorkspaceMain from './layouts/workspace/WorkspaceMain'

import PatentCreation from './features/patent_creation/pages/PatentCreation'
import PatentEdit from './features/patent_edit/pages/PatentEdit'

import Analogues from './features/get_analogues/pages/Analogues'
import AnaloguesPatentComparison from './features/comparison_with_analogues/pages/AnaloguesPatentComparison'
import Prototype from './features/prototype/pages/Prototype'
import Schemes from './features/schemes_creation/pages/Schemes'

import ProfileMain from './features/profile/pages/ProfileMain'
import ProfileSettings from './features/profile/pages/ProfileSettings'

import NotFound from './features/not_found/pages/NotFound'

import './App.css'

export default function App() {
  return (
    <PatentsProvider>
      <ReferenceProvider>
        <ToastProvider>
          <Routes>
            
            {/* Публичные маршруты (доступны всем) */}
            <Route path='/' element={<WelcomeLayout />}>
              <Route index element={<Welcome />} />
              <Route path='about' element={<About />} />
              <Route path='faq' element={<FAQ />} />
              <Route path='contacts' element={<Contacts />} />
              <Route path='login' element={<LogIn />} />
              <Route path='signin' element={<SignIn />} />
            </Route>
            
            {/* Защищённые маршруты (требуется авторизация) */}
            <Route element={<AuthorizedUserRoute />}>
              
              {/* Рабочее пространство */}
              <Route path='/workspace' element={<WorkspaceLayout />}>
                <Route index element={<WorkspaceMain />} />
                <Route path='documentation' element={<div>Документация</div>} />
                <Route path='questions' element={<FAQ />} />
                <Route path='patent-creation' element={<PatentCreation />} />
                <Route path='patents/:id/edit' element={<PatentEdit />} />
                
                {/* Анализ патента (вложенные маршруты) */}
                <Route path='patents/:id' element={<ReferenceLayout />}>
                  <Route path='analogs' element={<Analogues />} />
                  <Route path='attributes' element={<AnaloguesPatentComparison />} />
                  <Route path='prototype' element={<Prototype />} />
                  <Route path="schemes" element={<Schemes />} />
                </Route>
              </Route>
              
              {/* Профиль пользователя */}
              <Route path="/profile" element={<ProfileLayout />}>
                <Route index element={<ProfileMain />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="feedback" element={<div>Обратная связь</div>} />
              </Route>
              
            </Route>
            
            {/* 404*/}
            <Route path='*' element={<NotFound />} />
            
          </Routes>
        </ToastProvider>
      </ReferenceProvider>
    </PatentsProvider>
  )
}