import { useState } from 'react';
import { PageHeader, PermissionNote } from '../app/Layout';
import { Button, Card, Modal, Select } from '../components/ui';
import { SectionTitle } from '../components/common';
import { useApp } from '../stores/app';
export function SettingsPage() {
  const prefs = useApp((s) => s.preferences);
  const setPrefs = useApp((s) => s.setPreferences);
  const reset = useApp((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="PREFERÊNCIAS LOCAIS"
        title="Configurações"
        description="Ajustes deste navegador para a interface demonstrativa."
      />
      <div className="settings-grid">
        <Card>
          <SectionTitle title="Aparência e exibição" />
          <div className="settings-fields">
            <Select
              label="Tema"
              value={prefs.theme}
              onChange={(v) => setPrefs({ theme: v as 'light' | 'dark' })}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
              ]}
            />
            <Select
              label="Formato de data"
              value={prefs.dateFormat}
              onChange={(v) => setPrefs({ dateFormat: v as 'short' | 'long' })}
              options={[
                { value: 'short', label: 'Curto' },
                { value: 'long', label: 'Detalhado' },
              ]}
            />
            <Select
              label="Fuso horário"
              value={prefs.timeZone}
              onChange={(v) => setPrefs({ timeZone: v })}
              options={[
                { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/Manaus', label: 'Manaus (AMT)' },
              ]}
            />
            <label className="toggle-row">
              <span>Grade nos gráficos</span>
              <input
                type="checkbox"
                checked={prefs.chartGrid}
                onChange={(e) => setPrefs({ chartGrid: e.target.checked })}
              />
            </label>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Simulação e notificações" />
          <div className="settings-fields">
            <Select
              label="Atualização da simulação"
              value={String(prefs.interval)}
              onChange={(v) => setPrefs({ interval: Number(v) })}
              options={[
                { value: '3', label: 'A cada 3 segundos' },
                { value: '5', label: 'A cada 5 segundos' },
                { value: '10', label: 'A cada 10 segundos' },
                { value: '30', label: 'A cada 30 segundos' },
              ]}
            />
            <label className="toggle-row">
              <span>Indicadores de notificação</span>
              <input
                type="checkbox"
                checked={prefs.notifications}
                onChange={(e) => setPrefs({ notifications: e.target.checked })}
              />
            </label>
            <p className="subtle">
              As preferências ficam salvas apenas neste navegador.
            </p>
          </div>
        </Card>
        <Card className="settings-wide">
          <SectionTitle title="Dados de demonstração" />
          <p>
            Restaure dispositivos e alertas iniciais para explorar o painel
            novamente.
          </p>
          <PermissionNote />
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Restaurar dados locais
          </Button>
        </Card>
      </div>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Restaurar dados demonstrativos"
      >
        <p>As edições locais em dispositivos e alertas serão descartadas.</p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              reset();
              setConfirm(false);
            }}
          >
            Restaurar
          </Button>
        </div>
      </Modal>
    </>
  );
}
