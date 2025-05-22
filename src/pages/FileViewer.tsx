import React from 'react'
import { useSearchParams } from 'react-router-dom'

const FileViewer = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchParams = useSearchParams();
    // console.log(searchParams)  
  return (
    <div>FileViewer</div>
  )
}

export default FileViewer