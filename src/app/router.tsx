import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import { HomePage } from '../features/home/HomePage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
])
