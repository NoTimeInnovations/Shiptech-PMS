import React from 'react'
import { useSearchParams } from 'react-router-dom'

const FileViewer = () => {
  const searchParams = useSearchParams();
    // console.log(searchParams)  
  return (
    <div>FileViewer</div>
  )
}

export default FileViewer