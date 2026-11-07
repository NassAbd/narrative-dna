/**
 * MOCK DATA — fictional content for UI development only.
 * All creators, video IDs and quotations are invented for demonstration.
 * No source URLs are provided: they are never fabricated.
 * Replace this module (via the NarrativeService) with real Oriane data.
 */
import type { EvidenceClip, Narrative, Platform } from "./types";

export interface MockVideo {
  videoId: string;
  platform: Platform;
  creator: { handle: string; displayName?: string };
  publishedAt: string;
}

export const MOCK_VIDEOS: MockVideo[] = [
  { videoId: "mock-tt-0001", platform: "tiktok", creator: { handle: "@lea.cherche.un.studio", displayName: "Léa (mock)" }, publishedAt: "2026-10-28" },
  { videoId: "mock-tt-0002", platform: "tiktok", creator: { handle: "@karim_locataire" }, publishedAt: "2026-10-21" },
  { videoId: "mock-tt-0003", platform: "tiktok", creator: { handle: "@immo.decrypte", displayName: "Immo Décrypté (mock)" }, publishedAt: "2026-10-30" },
  { videoId: "mock-tt-0004", platform: "tiktok", creator: { handle: "@proprio.bailleur" }, publishedAt: "2026-10-12" },
  { videoId: "mock-tt-0005", platform: "tiktok", creator: { handle: "@etudiante.lyon" }, publishedAt: "2026-11-02" },
  { videoId: "mock-tt-0006", platform: "tiktok", creator: { handle: "@marseille.quartiers" }, publishedAt: "2026-10-18" },
  { videoId: "mock-ig-0001", platform: "instagram", creator: { handle: "@habiter.paris", displayName: "Habiter Paris (mock)" }, publishedAt: "2026-10-25" },
  { videoId: "mock-ig-0002", platform: "instagram", creator: { handle: "@collectif.logement" }, publishedAt: "2026-10-15" },
  { videoId: "mock-ig-0003", platform: "instagram", creator: { handle: "@agent.immo.bordeaux" }, publishedAt: "2026-11-01" },
  { videoId: "mock-yt-0001", platform: "youtube", creator: { handle: "@EconomieDuLogement", displayName: "Économie du Logement (mock)" }, publishedAt: "2026-10-09" },
  { videoId: "mock-yt-0002", platform: "youtube", creator: { handle: "@VilleEtTerritoires" }, publishedAt: "2026-10-27" },
  { videoId: "mock-yt-0003", platform: "youtube", creator: { handle: "@BretagneLocale" }, publishedAt: "2026-10-05" },
];

const v = (id: string) => {
  const found = MOCK_VIDEOS.find((x) => x.videoId === id);
  if (!found) throw new Error(`Unknown mock video ${id}`);
  return found;
};

function clip(
  id: string,
  videoId: string,
  data: Omit<EvidenceClip, "id" | "videoId" | "platform" | "creator" | "publishedAt">,
): EvidenceClip {
  const video = v(videoId);
  return { id, videoId, platform: video.platform, creator: video.creator, publishedAt: video.publishedAt, ...data };
}

/** Corpus totals per platform (videos found by Oriane / videos analyzed). */
export const MOCK_CORPUS_COUNTS: Record<Platform, { found: number; analyzed: number }> = {
  tiktok: { found: 24, analyzed: 18 },
  instagram: { found: 11, analyzed: 7 },
  youtube: { found: 7, analyzed: 5 },
};

export const MOCK_NARRATIVES: Narrative[] = [
  {
    id: "n-income-requirements",
    claim: "Some renters argue that income requirements prevent them from accessing housing",
    summary:
      "Creators describe being turned away because landlords or agencies ask for income of three times the rent, a permanent contract, or a guarantor living in France.",
    supportingVideoCount: 8,
    evidence: [
      clip("e1", "mock-tt-0001", {
        quote: "On me demande de gagner trois fois le loyer. Avec un SMIC, à Paris, c'est juste impossible.",
        startSec: 12, endSec: 19, sourceType: "transcript",
        transcriptContext: "J'ai visité six studios ce mois-ci. On me demande de gagner trois fois le loyer. Avec un SMIC, à Paris, c'est juste impossible. Et on ne regarde même pas mon dossier.",
        frameTimestampSec: 14,
      }),
      clip("e2", "mock-tt-0002", {
        quote: "CDI obligatoire, garant en Île-de-France… je coche aucune case.",
        startSec: 4, endSec: 9, sourceType: "transcript",
        transcriptContext: "L'annonce dit : CDI obligatoire, garant en Île-de-France… je coche aucune case. Pourtant je paie mon loyer actuel depuis cinq ans sans retard.",
      }),
      clip("e3", "mock-tt-0005", {
        quote: "Dossier refusé : revenus insuffisants",
        startSec: null, endSec: null, sourceType: "onScreenText",
      }),
      clip("e4", "mock-ig-0002", {
        quote: "Les critères de revenus excluent de fait les jeunes actifs et les familles monoparentales.",
        startSec: 31, endSec: 38, sourceType: "transcript",
        transcriptContext: "Ce qu'on observe sur le terrain, c'est que les critères de revenus excluent de fait les jeunes actifs et les familles monoparentales.",
        frameTimestampSec: 33,
      }),
    ],
  },
  {
    id: "n-short-term-rentals",
    claim: "Several creators claim that short-term tourist rentals reduce the supply of long-term housing in city centres",
    summary:
      "Videos point to furnished tourist rentals in central neighbourhoods and argue they remove apartments from the long-term market. Some cite figures that are not verified here.",
    supportingVideoCount: 6,
    evidence: [
      clip("e5", "mock-ig-0001", {
        quote: "Dans mon immeuble, quatre appartements sur dix sont loués aux touristes toute l'année.",
        startSec: 8, endSec: 15, sourceType: "transcript",
        transcriptContext: "Je vous montre mon immeuble. Dans mon immeuble, quatre appartements sur dix sont loués aux touristes toute l'année. Les boîtes à clés sont partout.",
        frameTimestampSec: 10,
      }),
      clip("e6", "mock-tt-0006", {
        quote: "Le Panier, c'est devenu un hôtel à ciel ouvert.",
        startSec: 22, endSec: 26, sourceType: "transcript",
      }),
      clip("e7", "mock-yt-0002", {
        quote: "La location touristique n'explique pas tout, mais elle pèse dans les zones déjà tendues.",
        startSec: 412, endSec: 421, sourceType: "transcript",
        transcriptContext: "Il faut être nuancé : la location touristique n'explique pas tout, mais elle pèse dans les zones déjà tendues, notamment dans les hypercentres.",
        frameTimestampSec: 415,
      }),
    ],
  },
  {
    id: "n-landlord-risk",
    claim: "Some landlords say that fear of unpaid rent and new energy rules leads them to withdraw properties from rental",
    summary:
      "Property owners describe tighter energy-performance requirements and the risk of unpaid rent as reasons for selling or leaving homes empty.",
    supportingVideoCount: 5,
    evidence: [
      clip("e8", "mock-tt-0004", {
        quote: "Mon appartement est classé G. Soit je fais 30 000 euros de travaux, soit je vends.",
        startSec: 3, endSec: 10, sourceType: "transcript",
        transcriptContext: "Mon appartement est classé G. Soit je fais 30 000 euros de travaux, soit je vends. Je ne peux plus le louer à partir de l'an prochain.",
        frameTimestampSec: 5,
      }),
      clip("e9", "mock-ig-0003", {
        quote: "Les propriétaires que j'accompagne ont peur des impayés.",
        startSec: 17, endSec: 21, sourceType: "transcript",
      }),
      clip("e10", "mock-yt-0001", {
        quote: "Passoires thermiques : ce que change le calendrier",
        startSec: null, endSec: null, sourceType: "onScreenText",
        frameTimestampSec: 2,
      }),
    ],
  },
  {
    id: "n-students",
    claim: "Students describe accepting substandard or distant housing because affordable options near campuses are scarce",
    summary:
      "Student creators share long commutes, shared rooms and poorly insulated flats, framing them as the only options within their budget.",
    supportingVideoCount: 4,
    evidence: [
      clip("e11", "mock-tt-0005", {
        quote: "1h20 de trajet chaque matin, parce que c'est le seul truc à moins de 500 euros.",
        startSec: 6, endSec: 12, sourceType: "transcript",
        transcriptContext: "Je vous emmène sur mon trajet. 1h20 de trajet chaque matin, parce que c'est le seul truc à moins de 500 euros.",
        frameTimestampSec: 8,
      }),
      clip("e12", "mock-tt-0001", {
        quote: "Avant, je partageais une chambre de 12 m² avec une autre étudiante.",
        startSec: 41, endSec: 46, sourceType: "transcript",
      }),
      clip("e13", "mock-tt-0003", {
        quote: "Résidence universitaire : liste d'attente de plusieurs mois",
        startSec: null, endSec: null, sourceType: "onScreenText",
      }),
    ],
  },
  {
    id: "n-rural-regions",
    claim: "Residents of some coastal and rural areas argue that second homes are pricing out local workers",
    summary:
      "Creators in tourist regions say seasonal demand and second homes push prices beyond what local salaries allow.",
    supportingVideoCount: 3,
    evidence: [
      clip("e14", "mock-yt-0003", {
        quote: "Ici, les volets sont fermés neuf mois sur douze, et les saisonniers dorment dans leur voiture.",
        startSec: 95, endSec: 103, sourceType: "transcript",
        transcriptContext: "Ici, les volets sont fermés neuf mois sur douze, et les saisonniers dorment dans leur voiture. Ce n'est pas une caricature, je l'ai filmé.",
        frameTimestampSec: 98,
      }),
      clip("e15", "mock-tt-0003", {
        quote: "Résidences secondaires : la commune envisage une surtaxe",
        startSec: 14, endSec: 18, sourceType: "onScreenText",
      }),
      clip("e16", "mock-ig-0001", {
        quote: "Ma grand-mère a vécu ici toute sa vie. Moi, je ne peux plus.",
        startSec: 52, endSec: 56, sourceType: "transcript",
      }),
    ],
  },
];

/** Topic keywords the mock recognises as "housing in France". */
export const MOCK_TOPIC_KEYWORDS = ["logement", "housing", "loyer", "rent", "immobilier", "location", "habitat"];

export const MOCK_EXAMPLE_TOPICS = ["Logement en France", "Loyers à Paris", "Location étudiante"];
