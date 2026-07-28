import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import { FaceReadingHistoryPage } from '../features/face-reading/FaceReadingHistoryPage'
import { FaceReadingResultPage } from '../features/face-reading/FaceReadingResultPage'
import { HomePage } from '../features/home/HomePage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'result', element: <FaceReadingResultPage /> },
      { path: 'history', element: <FaceReadingHistoryPage /> },
    ],
  },
])
