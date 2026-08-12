const GITHUB_URL = 'https://github.com/yoonzm/OneFeed';

export function GitHubLink() {
  return (
    <a
      className="grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-onefeed-ink transition-colors duration-150 hover:bg-onefeed-blue-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus"
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="在 GitHub 查看 OneFeed"
      title="GitHub"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.2c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.95 10.95 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.06.79 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
      </svg>
    </a>
  );
}
