import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.min.mjs'
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline'

GlobalWorkerOptions.workerPort = new PdfWorker()

export { getDocument }
