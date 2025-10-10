interface TemplateBlock {
  type: string;
  props: Record<string, any>;
}

interface Template {
  version: number;
  blocks: TemplateBlock[];
  brand?: {
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
  };
}

export function renderTemplate(template: Template, variables: Record<string, any> = {}): string {
  const brand = template.brand || {};
  const primaryColor = brand.colors?.primary || '#3b82f6';
  const textColor = brand.colors?.text || '#1f2937';

  let blocksHtml = template.blocks.map(block => renderBlock(block, variables)).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    img { max-width: 100%; height: auto; display: block; }
    a { color: ${primaryColor}; text-decoration: none; }
  </style>
</head>
<body style="background-color: #f3f4f6; padding: 20px;">
  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px;">
        ${blocksHtml}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function renderBlock(block: TemplateBlock, variables: Record<string, any>): string {
  const interpolate = (text: string) => {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => variables[key] || '');
  };

  switch (block.type) {
    case 'hero':
      return `
        <div style="text-align: center; margin-bottom: 32px;">
          ${block.props.image ? `<img src="${block.props.image}" alt="${block.props.heading || ''}" style="width: 100%; margin-bottom: 24px;">` : ''}
          <h1 style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0 0 16px 0;">
            ${interpolate(block.props.heading || '')}
          </h1>
          ${block.props.subheading ? `<p style="font-size: 18px; color: #6b7280; margin: 0;">${interpolate(block.props.subheading)}</p>` : ''}
        </div>
      `;

    case 'text':
      return `
        <div style="margin-bottom: 24px; font-size: 16px; line-height: 1.6; color: #374151;">
          ${interpolate(block.props.content || '')}
        </div>
      `;

    case 'button':
      return `
        <div style="text-align: ${block.props.align || 'center'}; margin: 32px 0;">
          <a href="${block.props.url}" style="display: inline-block; padding: 14px 28px; background-color: ${block.props.color || '#3b82f6'}; color: #ffffff; border-radius: 6px; font-weight: 600; text-decoration: none;">
            ${interpolate(block.props.text || 'Click here')}
          </a>
        </div>
      `;

    case 'image':
      return `
        <div style="margin: 24px 0;">
          <img src="${block.props.src}" alt="${block.props.alt || ''}" style="width: 100%;">
        </div>
      `;

    case 'spacer':
      return `<div style="height: ${block.props.height || 24}px;"></div>`;

    case 'divider':
      return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">`;

    case 'footer':
      return `
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
          ${interpolate(block.props.content || '')}
          ${block.props.unsubscribeUrl ? `<br><a href="${block.props.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>` : ''}
        </div>
      `;

    default:
      return '';
  }
}
