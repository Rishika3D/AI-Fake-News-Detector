import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import InsertData from './components/InsertData'

function App() {
  const [count, setCount] = useState(0)

  return (
    <InsertData/>
  )
}

export default App
