'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { AutomonitoramentoDocument, AutomonitoramentoDocumentProps } from '@/components/pdf/AutomonitoramentoDocument';
import { FileDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AutomonitoramentoDownloadBtn({ data }: { data: AutomonitoramentoDocumentProps }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <button disabled className="inline-flex items-center gap-2 rounded-md bg-sky-600/50 px-4 py-2 text-sm font-medium text-sky-100 cursor-not-allowed">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparando PDF...
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={<AutomonitoramentoDocument {...data} />}
      fileName={`Automonitoramento-${data.monthStr.replace(/\s+/g, '-')}.pdf`}
      className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
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
            Baixar PDF (Automonitoramento)
          </>
        )
      }
    </PDFDownloadLink>
  );
}
