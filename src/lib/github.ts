import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string;
const OWNER = import.meta.env.VITE_GITHUB_OWNER as string;
const REPO = import.meta.env.VITE_GITHUB_REPO as string;
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH as string;

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
  request: {
    fetch: (url: string, options: RequestInit) => {
      // Replace encoded forward slashes in the URL
      const decodedUrl = url.toString().replace(/%2F/g, '/');
      return fetch(decodedUrl, options);
    }
  }
});

export const uploadToGitHub = async (
  file: File,
  path: string
): Promise<string> => {
  try {
    // Ensure path uses forward slashes and remove any leading/trailing slashes
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

    // Convert file to Base64 using FileReader
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

    // Check if the file already exists
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: cleanPath,
        ref: BRANCH,
      });

      if (Array.isArray(data)) {
        // If the path is a directory, throw an error
        throw new Error("Path is a directory, not a file.");
      } else {
        // If the file exists, get its sha
        sha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) {
        // If the error is not "Not Found", rethrow it
        throw error;
      }
      // If the file doesn't exist, sha remains undefined
    }

    // Upload or update the file
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
      return url as string;
    } else {
      throw new Error("Failed to retrieve file URL from GitHub.");
    }
  } catch (error) {
    console.error("Error uploading to GitHub:", error);
    throw new Error("Failed to upload file to GitHub.");
  }
};