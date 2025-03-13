import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string;
const OWNER = import.meta.env.VITE_GITHUB_OWNER as string;
const REPO = import.meta.env.VITE_GITHUB_REPO as string;
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH as string;

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
  request: {
    fetch: (url: string, options: RequestInit) => {
      const decodedUrl = url.toString().replace(/%2F/g, '/');
      return fetch(decodedUrl, options);
    }
  }
});

export const uploadCommentFilesToGitHub = async (
  files: File[],
  projectId: string,
  commentsLength: number
): Promise<{ url: string; name: string; number: string }[]> => {
  const attachments: { url: string; name: string; number: string }[] = [];

  for (const file of files) {
    const cleanPath = `Projects/${projectId}/v${commentsLength + 1}/${file.name}`;
    
    // Log the values for debugging
    // console.log("Uploading file to GitHub:");
    // console.log("Owner:", OWNER);
    // console.log("Repo:", REPO);
    // console.log("Path:", cleanPath);

    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file."));
      };
      reader.readAsDataURL(file);
    });

    let sha: string | undefined;

    // Check if the file already exists
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: cleanPath,
        ref: BRANCH,
      });

      if (Array.isArray(data)) {
        throw new Error("Path is a directory, not a file.");
      } else {
        sha = data.sha; // Get the SHA of the existing file
      }
    } catch (error: any) {
      if (error.status !== 404) {
        throw error; // If it's not a 404 error, rethrow it
      }
      // If the file doesn't exist, sha remains undefined
    }

    try {
      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: cleanPath,
        message: `Upload file: ${file.name}`,
        content: fileContent,
        branch: BRANCH,
        sha, // Include the sha if the file already exists
      });

      if (data.content) {
        const url = data.content.download_url;
        attachments.push({ url: url as string, name: file.name, number: '' }); // Add number later in ProjectComments.tsx
      } else {
        throw new Error("Failed to retrieve file URL from GitHub.");
      }
    } catch (error) {
      console.error("Error uploading to GitHub:", error);
      throw new Error("Failed to upload file to GitHub.");
    }
  }

  return attachments;
}; 