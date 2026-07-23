import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import { HomePage } from '../features/home/HomePage'
import { SuncareActionPage } from '../features/suncare/SuncareActionPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'start', element: <SuncareActionPage mode="start" /> },
      { path: 'reapply', element: <SuncareActionPage mode="reapply" /> },
      { path: 'today', element: <SuncareActionPage mode="today" /> },
      { path: 'history', element: <SuncareActionPage mode="history" /> },
    ],
  },
])
