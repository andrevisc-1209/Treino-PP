import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Gift, MessageSquareQuote, Wallet } from "lucide-react";
import { BottomSheet } from "@/components/ui";
import { cn } from "@/lib/utils";
import { tempoRelativo } from "@/features/execucoes/metricas";
import { MODALIDADES_CONFIG } from "@/types/modalidades";
import { agruparNotificacoes } from "./agrupar";
import { linkEncerrarMes, textoCicloEncerrado } from "./ciclo";
import { textoAvisoIndicacao } from "@/features/indicacao/indicacao";
import {
  useMarcarLida,
  useMarcarLidasPorTipo,
  useMarcarTodasLidas,
  useNaoLidas,
  useNotaDaExecucao,
  useNotificacoes,
  type Notificacao,
} from "./api";

const TREINOS_VISIVEIS = 3;

function Nota({ execucaoId }: { execucaoId: string }) {
  const { data, isLoading } = useNotaDaExecucao(execucaoId);
  return (
    <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-2 text-sm text-slate-700">
      {isLoading ? "Carregando…" : (data ?? "Sem observação.")}
    </p>
  );
}

/** Sino do personal: contagem de não lidas e lista das últimas notificações (treinos concluídos pelos alunos). */
export function SinoNotificacoes() {
  const navigate = useNavigate();
  const { data: contagem } = useNaoLidas();
  const naoLidas = contagem?.total ?? 0;
  const pedemAcao = (contagem?.acao ?? 0) > 0;
  const { data: lista } = useNotificacoes();
  const marcar = useMarcarLida();
  const marcarTodas = useMarcarTodasLidas();
  const marcarTreinos = useMarcarLidasPorTipo();
  const [aberto, setAberto] = useState(false);
  const [notaAberta, setNotaAberta] = useState<string | null>(null);
  const [verTodosTreinos, setVerTodosTreinos] = useState(false);
  const [verLidas, setVerLidas] = useState(false);
  const grupos = useMemo(() => agruparNotificacoes(lista ?? []), [lista]);
  const treinosVisiveis = verTodosTreinos
    ? grupos.treinos
    : grupos.treinos.slice(0, TREINOS_VISIVEIS);

  const abrir = (n: Notificacao) => {
    if (!n.lida) marcar.mutate(n.id);
    setAberto(false);
    if (!n.aluno_id) return navigate("/configuracoes");
    navigate(
      n.tipo === "ciclo_encerrado"
        ? linkEncerrarMes(n.aluno_id, n.payload)
        : `/alunos/${n.aluno_id}?tab=Performance`,
    );
  };

  const renderizar = (n: Notificacao) => {
    if (n.tipo === "indicacao_concedida") {
      const { titulo, texto } = textoAvisoIndicacao(n.payload);
      return (
        <li
          key={n.id}
          className={cn(
            "rounded-2xl border p-3",
            n.lida ? "border-slate-200 bg-white" : "border-brand bg-brand-soft",
          )}
        >
          <p className="text-sm">
            <Gift size={14} className="mr-1 inline align-[-2px]" aria-hidden />{" "}
            <strong>{titulo}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-700">{texto}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {tempoRelativo(n.criada_em)}
            </span>
            <button
              type="button"
              onClick={() => abrir(n)}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              Ver indicações
            </button>
          </div>
        </li>
      );
    }
    if (n.tipo === "ciclo_encerrado") {
      return (
        <li
          key={n.id}
          className={cn(
            "rounded-2xl border p-3",
            n.lida ? "border-slate-200 bg-white" : "border-brand bg-brand-soft",
          )}
        >
          <p className="text-sm">
            <Wallet
              size={14}
              className="mr-1 inline align-[-2px]"
              aria-hidden
            />{" "}
            <strong>Ciclo encerrado — {n.aluno?.name ?? "Aluno"}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {textoCicloEncerrado(n.payload)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {tempoRelativo(n.criada_em)}
            </span>
            <button
              type="button"
              onClick={() => abrir(n)}
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-medium text-white active:bg-brand-hover"
            >
              Encerrar mês
            </button>
          </div>
        </li>
      );
    }
    const m = n.payload.modalidade;
    const emoji =
      m && MODALIDADES_CONFIG[m] ? MODALIDADES_CONFIG[m].emoji : "💪";
    return (
      <li
        key={n.id}
        className={cn(
          "rounded-2xl border p-3",
          n.lida ? "border-slate-200 bg-white" : "border-brand bg-brand-soft",
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => abrir(n)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-sm">
              {emoji} <strong>{n.aluno?.name ?? "Aluno"}</strong> concluiu “
              {n.payload.plano_nome ?? "treino"}”
            </span>
            <span className="block text-xs text-slate-500">
              {tempoRelativo(n.criada_em)}
            </span>
          </button>
          {n.payload.tem_notas && n.payload.execucao_id && (
            <button
              type="button"
              onClick={() => setNotaAberta(notaAberta === n.id ? null : n.id)}
              aria-expanded={notaAberta === n.id}
              aria-label="Ler observação do aluno"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
            >
              <MessageSquareQuote size={18} />
            </button>
          )}
        </div>
        {notaAberta === n.id && n.payload.execucao_id && (
          <Nota execucaoId={n.payload.execucao_id} />
        )}
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={
          naoLidas > 0
            ? `Notificações: ${naoLidas} não lidas${pedemAcao ? `, ${contagem?.acao} pedem ação` : ""}`
            : "Notificações"
        }
        className="relative flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
      >
        <Bell size={22} />
        {naoLidas > 0 && (
          <span
            className={cn(
              "absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-5 text-white",
              pedemAcao ? "bg-red-600" : "bg-slate-600",
            )}
            aria-hidden
          >
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      <BottomSheet
        open={aberto}
        onClose={() => setAberto(false)}
        title="Notificações"
      >
        <div className="space-y-3">
          {naoLidas > 0 && (
            <button
              type="button"
              onClick={() => marcarTodas.mutate()}
              disabled={marcarTodas.isPending}
              className="min-h-11 w-full rounded-xl border border-slate-300 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              Marcar todas como lidas
            </button>
          )}
          {lista?.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">
              Nenhuma notificação por enquanto.
            </p>
          )}
          {grupos.acao.length > 0 && (
            <section aria-labelledby="notif-acao" className="space-y-2">
              <h3 id="notif-acao" className="text-sm font-bold text-red-800">
                Pedem sua ação ({grupos.acao.length})
              </h3>
              <ul className="space-y-2">{grupos.acao.map(renderizar)}</ul>
            </section>
          )}
          {grupos.novidades.length > 0 && (
            <section aria-labelledby="notif-novidades" className="space-y-2">
              <h3
                id="notif-novidades"
                className="text-sm font-semibold text-slate-600"
              >
                Novidades
              </h3>
              <ul className="space-y-2">{grupos.novidades.map(renderizar)}</ul>
            </section>
          )}
          {grupos.treinos.length > 0 && (
            <section aria-labelledby="notif-treinos" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3
                  id="notif-treinos"
                  className="text-sm font-semibold text-slate-600"
                >
                  Treinos concluídos ({grupos.treinos.length})
                </h3>
                <button
                  type="button"
                  onClick={() => marcarTreinos.mutate(["treino_concluido"])}
                  disabled={marcarTreinos.isPending}
                  className="min-h-11 rounded-xl px-2 text-sm font-medium text-brand-hover active:bg-slate-100"
                >
                  Marcar como lidos
                </button>
              </div>
              <ul className="space-y-2">{treinosVisiveis.map(renderizar)}</ul>
              {grupos.treinos.length > TREINOS_VISIVEIS && (
                <button
                  type="button"
                  onClick={() => setVerTodosTreinos((v) => !v)}
                  aria-expanded={verTodosTreinos}
                  className="min-h-11 w-full rounded-xl text-sm font-medium text-brand-hover active:bg-slate-100"
                >
                  {verTodosTreinos
                    ? "Mostrar menos"
                    : `Ver todos (${grupos.treinos.length})`}
                </button>
              )}
            </section>
          )}
          {grupos.lidas.length > 0 && (
            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setVerLidas((v) => !v)}
                aria-expanded={verLidas}
                className="min-h-11 w-full rounded-xl text-sm font-medium text-slate-600 active:bg-slate-100"
              >
                {verLidas
                  ? "Esconder anteriores"
                  : `Anteriores (${grupos.lidas.length})`}
              </button>
              {verLidas && (
                <ul className="space-y-2">{grupos.lidas.map(renderizar)}</ul>
              )}
            </section>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
