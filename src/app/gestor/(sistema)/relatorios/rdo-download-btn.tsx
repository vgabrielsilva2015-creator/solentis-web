'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { RdoDocument, RdoDocumentProps } from '@/components/pdf/RdoDocument';
import { FileDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function RdoDownloadBtn({ data }: { data: RdoDocumentProps }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <button disabled className="inline-flex items-center gap-2 rounded-md bg-emerald-600/50 px-4 py-2 text-sm font-medium text-emerald-100 cursor-not-allowed">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparando PDF...
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={<RdoDocument {...data} />}
      fileName={`RDO-${data.dateStr.replace(/\//g, '-')}.pdf`}
      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
    >
      {({ loading }) =>
        loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando documento...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            Baixar PDF (RDO)
          </>
        )
      }
    </PDFDownloadLink>
  );
}
