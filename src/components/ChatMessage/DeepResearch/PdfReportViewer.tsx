import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReportViewerProps {
  blob: Blob;
}

export function PdfReportViewer({ blob }: PdfReportViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const file = useMemo(() => blob, [blob]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    return Math.max(containerWidth - 32, 280);
  }, [containerWidth]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto overflow-x-hidden"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col items-center gap-6 px-4 py-2">
        <Document
          file={file}
          loading={null}
          onLoadSuccess={(pdf) => {
            setNumPages(pdf.numPages);
          }}
          onLoadError={(error) => {
            console.error("load pdf document failed", error);
          }}
          className="flex w-full flex-col items-center gap-6"
        >
          {Array.from({ length: numPages }, (_, index) => (
            <Page
              key={index + 1}
              pageNumber={index + 1}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={null}
              className="max-w-full overflow-hidden bg-white shadow-[0_4px_24px_rgba(15,23,42,0.12)]"
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
