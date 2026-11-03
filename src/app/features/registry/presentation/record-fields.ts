import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface RecordField { readonly label: string; readonly value: string; readonly href?: string | null; }

export function webUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? '');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function commitUrl(repositoryUrl: string, commitSha: string): string | null {
  const url = webUrl(repositoryUrl);
  if (!url || !/^[a-f0-9]{40}$/i.test(commitSha)) return null;
  const repository = new URL(url);
  if (repository.hostname !== 'github.com' || !/^\/[^/]+\/[^/]+\/?$/.test(repository.pathname)) return null;
  return `https://github.com${repository.pathname.replace(/\/$/, '').replace(/\.git$/, '')}/commit/${commitSha}`;
}

@Component({
  selector: 'app-record-fields',
  template: `<dl>@for (field of fields(); track field.label) {
    <div><dt>{{ field.label }}</dt><dd>@if (safeLink(field.href); as href) {
      <a [href]="href" target="_blank" rel="noopener noreferrer" [attr.aria-label]="field.label + ': ' + field.value + ' (opens in a new tab)'">{{ field.value }}</a>
    } @else { <span>{{ field.value }}</span> }</dd></div>
  }</dl>`,
  styles: `dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 20px 32px; margin: 0; }
    div { min-width: 0; } dt { color: var(--pact-muted); font-size: 12px; margin-bottom: 6px; }
    dd { margin: 0; font-family: Roboto, sans-serif; font-size: 14px; overflow-wrap: anywhere; line-height: 1.6; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordFields {
  readonly fields = input.required<readonly RecordField[]>();
  readonly safeLink = webUrl;
}
