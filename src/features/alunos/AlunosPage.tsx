import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useExigirAssinatura } from "@/features/assinatura/useExigirAssinatura";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  CalendarCheck,
  MoreVertical,
  Play,
  Search,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import { cn, desambiguarPorNome, idade } from "@/lib/utils";
import { BottomSheet, Fab, Input } from "@/components/ui";
import { LinkConfiguracoes } from "@/components/LinkConfiguracoes";
import { BotaoExportarAlunos } from "@/features/alunos/exportar/BotaoExportarAlunos";
import { TragaSeusAlunos } from "./TragaSeusAlunos";
import { CardMetrica } from "@/components/CardMetrica";
import { CardDeslizavel, type AcaoDeslize } from "@/components/CardDeslizavel";
import { PuxarParaAtualizar } from "@/components/PuxarParaAtualizar";
import { InstallBanner } from "@/components/InstallBanner";
import { Avatar } from "@/components/Avatar";
import { BotaoWhatsApp } from "@/components/BotaoWhatsApp";
import { mapearErroSupabase } from "@/lib/erros";
import { ListaSkeleton } from "@/components/Skeleton";
import { confirmarAcao } from "@/components/ConfirmSheet";
import { mostrarDesfazer } from "@/components/UndoToast";
import { useAlunosComCobranca } from "@/features/financeiro/api";
import {
  buscarResumoApagar,
  mensagemApagarAluno,
  mensagemMoverParaLixeira,
  rotuloLixeira,
} from "./apagarAluno";
import {
  useAlunos,
  useAlunosArquivados,
  useAlunosNaLixeira,
  useApagarAluno,
  useArquivarAluno,
  useDesarquivarAluno,
  useMoverParaLixeira,
  useRestaurarDaLixeira,
  type Aluno,
} from "./api";
import { useTreinosEstaSemana, useUltimaSessaoPorAluno } from "./useMetricas";
import { useAlunosComCobrancaPendente } from "./useCobrancaPendente";
import {
  contarFaixas,
  diasSemTreino,
  ordenarAlunos,
  pertenceAFaixa,
  ROTULO_FAIXA,
  ROTULO_ORDEM,
  type FaixaSemTreino,
  type OrdemAlunos,
} from "./filaAlunos";
import { RolagemHorizontal } from "@/components/RolagemHorizontal";
import { hojeSP } from "@/lib/datas";
import { useUltimaExecucaoPorAluno } from "@/features/execucoes/api";
import { rotuloDias } from "@/features/execucoes/metricas";
import { MODALIDADES_CONFIG } from "@/types/modalidades";

export function AlunosPage() {
  const [aba, setAba] = useState<"ativos" | "arquivados" | "lixeira">("ativos");
  const { data: alunosAtivos, isLoading, error } = useAlunos();
  const { data: alunosArquivados, isLoading: carregandoArquivados } =
    useAlunosArquivados();
  const { data: alunosNaLixeira, isLoading: carregandoLixeira } =
    useAlunosNaLixeira();
  const { data: alunosComCobranca } = useAlunosComCobranca();
  const { data: treinosEstaSemana } = useTreinosEstaSemana();
  const { data: ultimasSessoes } = useUltimaSessaoPorAluno();
  const comCobrancaPendente = useAlunosComCobrancaPendente();
  const { data: ultimasExecucoes } = useUltimaExecucaoPorAluno();
  const navigate = useNavigate();
  const { exigir, somenteLeitura, abrirPlanos } = useExigirAssinatura();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [menuAberto, setMenuAberto] = useState<Aluno | null>(null);
  const [faixa, setFaixa] = useState<FaixaSemTreino>("todos");
  const [ordem, setOrdem] = useState<OrdemAlunos>("nome");
  const [soSemValor, setSoSemValor] = useState(false);

  const arquivar = useArquivarAluno();
  const desarquivar = useDesarquivarAluno();
  const apagar = useApagarAluno();
  const moverParaLixeira = useMoverParaLixeira();
  const restaurarDaLixeira = useRestaurarDaLixeira();

  const alunos =
    aba === "ativos"
      ? alunosAtivos
      : aba === "arquivados"
        ? alunosArquivados
        : alunosNaLixeira;
  const idsComCobranca = new Set(
    (alunosComCobranca ?? []).map((c) => c.aluno_id),
  );

  // dias sem treino só fazem sentido para alunos ativos, e só depois de carregar as sessões (senão todos pareceriam "nunca treinou")
  const hoje = hojeSP();
  const diasDosAtivos = useMemo(() => {
    if (!alunosAtivos || !ultimasSessoes) return null;
    return new Map(
      alunosAtivos.map(
        (a) => [a.id, diasSemTreino(ultimasSessoes.get(a.id), hoje)] as const,
      ),
    );
  }, [alunosAtivos, ultimasSessoes, hoje]);
  const contagemFaixas = diasDosAtivos
    ? contarFaixas([...diasDosAtivos.values()])
    : null;
  const semTreinoRecente = contagemFaixas?.alerta;
  const filtrarPorFaixa =
    aba === "ativos" && diasDosAtivos !== null && faixa !== "todos";
  // só vale depois de carregar as cobranças (senão todos pareceriam "sem valor")
  const semValor = alunosComCobranca
    ? (alunosAtivos ?? []).filter((a) => !idsComCobranca.has(a.id))
    : [];

  const filtrados = useMemo(() => {
    const porBusca = alunos?.filter(
      (a) =>
        a.name.toLowerCase().includes(busca.trim().toLowerCase()) &&
        (!soSemValor || aba !== "ativos" || !idsComCobranca.has(a.id)),
    );
    if (!porBusca || aba !== "ativos" || !diasDosAtivos) return porBusca;
    const naFaixa = filtrarPorFaixa
      ? porBusca.filter((a) =>
          pertenceAFaixa(diasDosAtivos.get(a.id) ?? null, faixa),
        )
      : porBusca;
    // ao filtrar por faixa, o mais tempo sem treino vem primeiro, a menos que a pessoa tenha escolhido outra ordem
    const ordemEfetiva =
      filtrarPorFaixa && ordem === "nome" ? "sem_treino" : ordem;
    return ordenarAlunos(naFaixa, ordemEfetiva, {
      dias: diasDosAtivos,
      comCobrancaPendente,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    alunos,
    busca,
    aba,
    diasDosAtivos,
    filtrarPorFaixa,
    faixa,
    ordem,
    comCobrancaPendente,
    soSemValor,
    alunosComCobranca,
  ]);
  const desambiguar = desambiguarPorNome(alunos ?? []);

  const arquivarAluno = (a: Aluno) => {
    setMenuAberto(null);
    arquivar.mutate(a.id, {
      onSuccess: () =>
        mostrarDesfazer(`${a.name} foi arquivado.`, () =>
          desarquivar.mutate(a.id),
        ),
    });
  };

  const restaurarAluno = (a: Aluno) => {
    setMenuAberto(null);
    desarquivar.mutate(a.id);
  };

  const enviarParaLixeira = async (a: Aluno) => {
    setMenuAberto(null);
    const ok = await confirmarAcao({
      titulo: "Mover para a lixeira",
      mensagem: mensagemMoverParaLixeira(a.name),
      textoConfirmar: "Mover para a lixeira",
      destrutivo: true,
    });
    if (!ok) return;
    moverParaLixeira.mutate(a.id, {
      onSuccess: () =>
        mostrarDesfazer(`${a.name} foi para a lixeira.`, () =>
          restaurarDaLixeira.mutate(a.id),
        ),
    });
  };

  const tirarDaLixeira = (a: Aluno) => {
    setMenuAberto(null);
    restaurarDaLixeira.mutate(a.id, {
      onSuccess: () =>
        mostrarDesfazer(`${a.name} voltou para os arquivados.`, () =>
          moverParaLixeira.mutate(a.id),
        ),
    });
  };

  const apagarAluno = async (a: Aluno) => {
    setMenuAberto(null);
    const resumo = await buscarResumoApagar(a.id);
    const ok = await confirmarAcao({
      titulo: "Apagar agora",
      mensagem: mensagemApagarAluno(a.name, resumo),
      textoConfirmar: "Apagar para sempre",
      destrutivo: true,
    });
    if (!ok) return;
    apagar.mutate(a.id);
  };

  const acoesDeslize = (a: Aluno): AcaoDeslize[] =>
    aba === "ativos"
      ? [
          {
            label: "Treino",
            icone: <Play size={20} />,
            classe: "bg-brand",
            onClick: () => navigate(`/alunos/${a.id}/sessoes/nova`),
          },
          {
            label: "Arquivar",
            icone: <Archive size={20} />,
            classe: "bg-slate-600",
            onClick: () => arquivarAluno(a),
          },
        ]
      : aba === "arquivados"
        ? [
            {
              label: "Restaurar",
              icone: <ArchiveRestore size={20} />,
              classe: "bg-brand",
              onClick: () => restaurarAluno(a),
            },
          ]
        : [
            {
              label: "Restaurar",
              icone: <ArchiveRestore size={20} />,
              classe: "bg-brand",
              onClick: () => tirarDaLixeira(a),
            },
          ];

  return (
    <PuxarParaAtualizar onAtualizar={() => qc.invalidateQueries()}>
      <div className="mx-auto max-w-2xl p-4 pb-24">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Meus alunos</h1>
          <LinkConfiguracoes />
        </header>

        {(alunosAtivos?.length ?? 0) > 0 && <InstallBanner />}

        <div className="mb-4 grid grid-cols-3 gap-2">
          <CardMetrica
            icone={<Users size={16} />}
            valor={alunosAtivos?.length}
            label="Alunos ativos"
          />
          <CardMetrica
            icone={<CalendarCheck size={16} />}
            valor={treinosEstaSemana}
            label="Treinos essa semana"
          />
          <button
            type="button"
            onClick={() => {
              setAba("ativos");
              setFaixa((f) => (f === "alerta" ? "todos" : "alerta"));
            }}
            aria-pressed={faixa === "alerta"}
            aria-label="Mostrar só os alunos sem treino há mais de 7 dias"
            className={cn(
              "rounded-xl text-left",
              faixa === "alerta" && "ring-2 ring-brand",
            )}
          >
            <CardMetrica
              icone={<TriangleAlert size={16} />}
              valor={semTreinoRecente}
              label="Sem treino há +7 dias"
              alerta={(semTreinoRecente ?? 0) > 0}
            />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setAba("ativos")}
            className={cn(
              "min-h-11 flex-1 rounded-lg text-sm font-medium",
              aba === "ativos" ? "bg-white shadow-sm" : "text-slate-500",
            )}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setAba("arquivados")}
            className={cn(
              "min-h-11 flex-1 rounded-lg text-sm font-medium",
              aba === "arquivados" ? "bg-white shadow-sm" : "text-slate-500",
            )}
          >
            Arquivados
          </button>
          <button
            type="button"
            onClick={() => setAba("lixeira")}
            className={cn(
              "min-h-11 flex-1 rounded-lg text-sm font-medium",
              aba === "lixeira" ? "bg-white shadow-sm" : "text-slate-500",
            )}
          >
            Lixeira
          </button>
        </div>

        {/* fixa no scroll: em listas longas a busca não some */}
        <div className="sticky top-0 z-20 -mx-4 mb-2 bg-slate-50 px-4 py-2">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar aluno por nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {aba === "ativos" &&
          contagemFaixas &&
          (alunosAtivos?.length ?? 0) > 0 && (
            <div className="mb-3 space-y-2">
              {contagemFaixas.alerta > 0 && (
                <RolagemHorizontal className="py-1" corFundo="#f8fafc">
                  {(
                    [
                      "todos",
                      "alerta",
                      "8-14",
                      "15-30",
                      "30+",
                      "nunca",
                    ] as FaixaSemTreino[]
                  )
                    .filter((f) => f === "todos" || contagemFaixas[f] > 0)
                    .map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={faixa === f}
                        onClick={(e) => {
                          setFaixa(f);
                          e.currentTarget.scrollIntoView({
                            inline: "center",
                            block: "nearest",
                            behavior: "smooth",
                          });
                        }}
                        className={cn(
                          "min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition",
                          faixa === f
                            ? "border-brand bg-brand text-white"
                            : "border-slate-300 bg-white text-slate-700",
                        )}
                      >
                        {ROTULO_FAIXA[f]}
                        {f !== "todos" && ` (${contagemFaixas[f]})`}
                      </button>
                    ))}
                </RolagemHorizontal>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="shrink-0">Ordenar por</span>
                <select
                  value={ordem}
                  onChange={(e) => setOrdem(e.target.value as OrdemAlunos)}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  {(Object.keys(ROTULO_ORDEM) as OrdemAlunos[]).map((o) => (
                    <option key={o} value={o}>
                      {ROTULO_ORDEM[o]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

        {aba === "ativos" && semValor.length > 0 && (
          <button
            type="button"
            aria-pressed={soSemValor}
            onClick={() => setSoSemValor((v) => !v)}
            className={cn(
              "mb-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm",
              soSemValor
                ? "bg-amber-100 text-amber-950"
                : "bg-amber-50 text-amber-900 active:bg-amber-100",
            )}
          >
            <span>
              <strong>{semValor.length}</strong>{" "}
              {semValor.length === 1
                ? "aluno sem valor definido"
                : "alunos sem valor definido"}
            </span>
            <span className="shrink-0 font-semibold">
              {soSemValor ? "Mostrar todos" : "Ver quais"}
            </span>
          </button>
        )}

        {(aba === "ativos"
          ? isLoading
          : aba === "arquivados"
            ? carregandoArquivados
            : carregandoLixeira) && <ListaSkeleton />}
        {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
        {alunos?.length === 0 && aba === "ativos" && (
          <TragaSeusAlunos
            onCadastrarUm={exigir(() => navigate("/alunos/novo"))}
            somenteLeitura={somenteLeitura}
            abrirPlanos={abrirPlanos}
          />
        )}
        {aba === "ativos" && (alunos?.length ?? 0) > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Link
              to="/alunos/importar"
              onClick={(e) => {
                if (somenteLeitura) {
                  e.preventDefault();
                  abrirPlanos();
                }
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              <Upload size={16} aria-hidden /> Importar planilha
            </Link>
            <BotaoExportarAlunos lado />
          </div>
        )}
        {alunos?.length === 0 && aba === "arquivados" && (
          <p className="text-slate-500">Nenhum aluno arquivado.</p>
        )}
        {aba === "lixeira" && (
          <p className="mb-2 text-sm text-slate-600">
            Alunos na lixeira são apagados de vez, com todo o histórico, depois
            de 30 dias. Até lá você pode restaurar.
          </p>
        )}
        {alunos?.length === 0 && aba === "lixeira" && (
          <p className="text-slate-500">A lixeira está vazia.</p>
        )}
        {alunos && alunos.length > 0 && filtrados?.length === 0 && (
          <p className="text-slate-500">
            Nenhum aluno encontrado para "{busca}".
          </p>
        )}

        <ul className="space-y-2">
          {filtrados?.map((a) => (
            <li key={a.id}>
              <CardDeslizavel acoes={acoesDeslize(a)}>
                <div className="flex items-center gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/alunos/${a.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <Avatar id={a.id} nome={a.name} />
                      <div className="min-w-0">
                        <p className="font-medium">
                          {a.name}
                          {desambiguar(a) && (
                            <span className="ml-1 font-normal text-slate-500">
                              · {desambiguar(a)}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[
                            idade(a.birth_date) != null &&
                              `${idade(a.birth_date)} anos`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Sem data de nascimento"}
                        </p>
                        {aba === "lixeira" && a.apagado_em && (
                          <p className="text-xs font-medium text-red-700">
                            {rotuloLixeira(a.apagado_em)}
                          </p>
                        )}
                        {a.objetivos[0] && (
                          <p className="truncate text-xs text-slate-500">
                            {a.objetivos[0]}
                          </p>
                        )}
                        {aba === "ativos" && ultimasExecucoes?.get(a.id) && (
                          <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {
                              MODALIDADES_CONFIG[
                                ultimasExecucoes.get(a.id)!.modalidade
                              ].emoji
                            }{" "}
                            {rotuloDias(
                              ultimasExecucoes.get(a.id)!.concluido_em,
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                    {aba === "ativos" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <BotaoWhatsApp
                          telefone={a.phone}
                          label={`WhatsApp de ${a.name}`}
                          size={16}
                          comTexto
                        />
                        <Link
                          to={`/alunos/${a.id}/sessoes/nova`}
                          onClick={(e) => {
                            if (somenteLeitura) {
                              e.preventDefault();
                              abrirPlanos();
                            }
                          }}
                          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand px-3 text-sm font-medium text-brand-hover active:bg-brand-soft"
                          aria-label={`Iniciar treino de ${a.name}`}
                        >
                          <Play size={16} aria-hidden /> Treino
                        </Link>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuAberto(a)}
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                    aria-label={`Mais ações para ${a.name}`}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </CardDeslizavel>
            </li>
          ))}
        </ul>

        {aba === "ativos" && (
          <Fab
            onClick={exigir(() => navigate("/alunos/novo"))}
            label="Novo aluno"
          />
        )}

        <BottomSheet
          open={!!menuAberto}
          onClose={() => setMenuAberto(null)}
          title={menuAberto?.name}
        >
          <div className="space-y-1">
            {aba === "ativos" && (
              <>
                <button
                  type="button"
                  onClick={() => menuAberto && arquivarAluno(menuAberto)}
                  disabled={arquivar.isPending}
                  className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
                >
                  Arquivar
                </button>
                <p className="px-3 py-2 text-xs text-slate-500">
                  Para apagar um aluno, arquive primeiro e depois mande para a
                  lixeira.
                </p>
              </>
            )}
            {aba === "arquivados" && (
              <>
                <button
                  type="button"
                  onClick={() => menuAberto && restaurarAluno(menuAberto)}
                  disabled={desarquivar.isPending}
                  className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => menuAberto && enviarParaLixeira(menuAberto)}
                  disabled={moverParaLixeira.isPending}
                  className="w-full rounded-xl px-3 py-3 text-left text-red-600 active:bg-slate-100"
                >
                  Mover para a lixeira
                </button>
              </>
            )}
            {aba === "lixeira" && (
              <>
                <button
                  type="button"
                  onClick={() => menuAberto && tirarDaLixeira(menuAberto)}
                  disabled={restaurarDaLixeira.isPending}
                  className="w-full rounded-xl px-3 py-3 text-left active:bg-slate-100"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => menuAberto && apagarAluno(menuAberto)}
                  disabled={apagar.isPending}
                  className="w-full rounded-xl px-3 py-3 text-left text-red-600 active:bg-slate-100"
                >
                  Apagar agora
                </button>
              </>
            )}
          </div>
        </BottomSheet>
      </div>
    </PuxarParaAtualizar>
  );
}
