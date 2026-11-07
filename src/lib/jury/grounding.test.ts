import { expect, it } from "vitest";
import { ClaimSchema, SelectionSchema, checkClaim, passagesFor, type Claim } from "./grounding";
import type { NormalizedVideo } from "./source-types";
const quote = "vous qui êtes en île de france j'ai besoin d'un t2 ou d'un t3 budget 1000 euros";
const video: NormalizedVideo = {
  source: {
    orianeId: "1",
    platformId: null,
    platform: "tiktok",
    creator: null,
    publishedAt: null,
    url: null,
  },
  transcript: quote,
  transcriptChunks: [{ text: quote, startSeconds: 16.88, endSeconds: 23.12 }],
  frames: [],
  onScreenText: [],
};
const claim: Claim = {
  videoId: "1",
  passageId: "0",
  formulation: "La personne cherche un T2 ou T3 avec un budget de 1 000 euros.",
  type: "description",
  quote,
  transcriptContext: quote,
  startSeconds: 16.88,
  endSeconds: 23.12,
};
it("keeps the request as a description pending review", () => {
  const c = checkClaim(claim, [video]);
  expect(c.status).toBe("candidate");
  expect(c.editorialReview).toBe("required");
});
it("rejects unaffordability, discrimination, rejection and invented budgets", () => {
  for (const formulation of [
    "Le logement est inabordable.",
    "La personne subit une discrimination.",
    "Son dossier est refusé.",
    "La personne dispose de 1300 euros.",
    "La personne rencontre des difficultés.",
  ])
    expect(checkClaim({ ...claim, formulation }, [video]).status).toBe("rejected");
});
it("does not convert a request to an argument or proposal", () => {
  for (const type of ["argument", "proposal", "objection"] as const)
    expect(checkClaim({ ...claim, type }, [video]).semanticValidation.reasons).toContain(
      "request_misclassified",
    );
});
it("rejects false quotes, sources, contexts and invalid timing", () => {
  for (const patch of [
    { quote: "invented" },
    { videoId: "2" },
    { transcriptContext: "invented" },
    { startSeconds: -1 },
    { endSeconds: null },
    { endSeconds: 1 },
    { endSeconds: Infinity },
    { startSeconds: 17 },
    { startSeconds: null, endSeconds: null },
  ])
    expect(checkClaim({ ...claim, ...patch }, [video]).evidenceValidation.status).toBe("rejected");
});
it("marks time unavailable only when the source has no valid chunks", () => {
  const v = { ...video, transcriptChunks: [] };
  const p = passagesFor(v)[0]!;
  expect(p.startSeconds).toBe(null);
  expect(checkClaim({ ...claim, ...p }, [v]).evidenceValidation.status).toBe("passed");
});
it("accepts zero claims and rejects malformed evidence contracts", () => {
  expect(
    SelectionSchema.parse({
      videos: [
        { videoId: "1", relevance: "relevant", relevanceReason: "Housing request", claims: [] },
      ],
    }).videos[0]?.claims,
  ).toEqual([]);
  expect(ClaimSchema.safeParse({}).success).toBe(false);
});
it("preserves questions as questions and supports empty extraction", () => {
  const text = "Comment trouver un logement ?";
  const v = { ...video, transcript: text, transcriptChunks: [] };
  const question: Claim = {
    videoId: "1",
    formulation: "La personne demande comment trouver un logement.",
    type: "question",
    ...passagesFor(v)[0]!,
  };
  expect(checkClaim(question, [v]).status).toBe("candidate");
  expect(checkClaim(question, [v]).claim.type).toBe("question");
});
it("returns no evidence for missing transcripts and ignores invalid provider times", () => {
  expect(passagesFor({ ...video, transcript: null })).toEqual([]);
  expect(
    passagesFor({
      ...video,
      transcriptChunks: [{ text: quote, startSeconds: -1, endSeconds: 2 }],
    })[0]?.startSeconds,
  ).toBe(null);
});
