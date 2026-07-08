import type { SourceCode } from "@/types/portfolio";

const VERCEL_API = "https://api.vercel.com";

function vercelHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  };
  return headers;
}

function teamQuery() {
  return process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
}

export async function createVercelProject(projectName: string): Promise<string> {
  const res = await fetch(`${VERCEL_API}/v9/projects${teamQuery()}`, {
    method: "POST",
    headers: vercelHeaders(),
    body: JSON.stringify({
      name: projectName,
      framework: "nextjs",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Vercel createProject failed: ${err.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  return data.id as string;
}

export async function deployToVercel(
  projectId: string,
  sourceCode: SourceCode
): Promise<{ deploymentId: string; url: string }> {
  // Build files array for Vercel deployment API
  const files = Object.entries(sourceCode).map(([file, content]) => ({
    file,
    data: content,
    encoding: "utf-8",
  }));

  const body: Record<string, unknown> = {
    name: projectId,
    files,
    projectSettings: {
      framework: "nextjs",
    },
    target: "production",
  };

  if (process.env.VERCEL_TEAM_ID) {
    body.teamId = process.env.VERCEL_TEAM_ID;
  }

  const res = await fetch(`${VERCEL_API}/v13/deployments${teamQuery()}`, {
    method: "POST",
    headers: vercelHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Vercel deploy failed: ${err.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  return {
    deploymentId: data.id as string,
    url: `https://${data.url}`,
  };
}

export async function waitForDeployment(
  deploymentId: string,
  maxWaitMs = 120_000
): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `${VERCEL_API}/v13/deployments/${deploymentId}${teamQuery()}`,
      { headers: vercelHeaders() }
    );

    if (!res.ok) throw new Error("Impossible de vérifier le statut du déploiement");

    const data = await res.json();
    const state: string = data.readyState ?? data.state;

    if (state === "READY") return `https://${data.url}`;
    if (state === "ERROR" || state === "CANCELED") {
      throw new Error(`Déploiement échoué: ${state}`);
    }

    // Poll every 3 seconds
    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error("Timeout déploiement (2 min)");
}
