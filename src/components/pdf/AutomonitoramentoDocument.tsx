import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a86a0',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 5,
  },
  metaText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  confidentialBadge: {
    color: '#0ea5e9',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
    padding: 5,
  },
  table: {
    width: '100%',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowStriped: {
    backgroundColor: '#f8fafc',
  },
  tableColHeader: {
    padding: 5,
    fontWeight: 'bold',
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
  },
  tableCol: {
    padding: 5,
  },
  textSmall: {
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  emptyState: {
    padding: 10,
    fontStyle: 'italic',
    color: '#94a3b8',
  }
});

export interface AnaliseData {
  time: string;
  parameter: string;
  value: number | string | null;
  unit: string;
  point: string;
  minLimit: number | null;
  maxLimit: number | null;
  isNonConformant: boolean;
  source: string; // "Interna" ou "Externa"
}

export interface AutomonitoramentoDocumentProps {
  monthStr: string; // ex: "Agosto 2026"
  generatedBy: string;
  tenantName?: string;
  analises: AnaliseData[];
}

export function AutomonitoramentoDocument({
  monthStr,
  generatedBy,
  tenantName = "Planta Principal",
  analises,
}: AutomonitoramentoDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>SOLENTIS</Text>
            </View>
            <Text style={styles.title}>Relatório de Automonitoramento</Text>
            <Text style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Unidade: {tenantName}</Text>
          </View>
          <View>
            <Text style={styles.confidentialBadge}>Documento Oficial / Compliance</Text>
            <Text style={styles.metaText}>Período: {monthStr}</Text>
            <Text style={styles.metaText}>Gerado em: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</Text>
            <Text style={styles.metaText}>Gerado por: {generatedBy}</Text>
          </View>
        </View>

        {/* ANÁLISES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análises Laboratoriais (Internas e Externas)</Text>
          {analises.length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, { backgroundColor: '#e2e8f0' }]}>
                <Text style={[styles.tableColHeader, { width: '15%' }]}>Data</Text>
                <Text style={[styles.tableColHeader, { width: '20%' }]}>Ponto</Text>
                <Text style={[styles.tableColHeader, { width: '20%' }]}>Parâmetro</Text>
                <Text style={[styles.tableColHeader, { width: '15%' }]}>Tipo</Text>
                <Text style={[styles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Limites</Text>
                <Text style={[styles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Resultado</Text>
              </View>
              {analises.map((item, i) => (
                <View key={i} style={[styles.tableRow, item.isNonConformant ? { backgroundColor: '#fef2f2' } : (i % 2 === 1 ? styles.tableRowStriped : {})]}>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '15%' }]}>{item.time}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '20%' }]}>{item.point}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '20%' }]}>{item.parameter}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '15%' }]}>{item.source}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '15%', textAlign: 'right' }]}>
                    {item.minLimit !== null ? `${item.minLimit} - ` : (item.maxLimit !== null ? 'Até ' : '-')}
                    {item.maxLimit !== null ? item.maxLimit : ''}
                  </Text>
                  <Text style={[
                    styles.tableCol, styles.textSmall, { width: '15%', textAlign: 'right', fontWeight: item.isNonConformant ? 'bold' : 'normal' },
                    item.isNonConformant ? { color: '#ef4444' } : {}
                  ]}>
                    {item.value} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyState}>Nenhuma análise registrada no período.</Text>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 8, color: '#94a3b8' }}>Documento gerado automaticamente pelo sistema Solentis.</Text>
          <Text style={{ fontSize: 8, color: '#94a3b8' }} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
}
