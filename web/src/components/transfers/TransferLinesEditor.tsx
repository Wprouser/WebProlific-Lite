import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { ApiItem } from '@/lib/items-api';

export interface DraftTransferLine {
  itemId: string;
  quantity: string;
  /** Empty string = let the server auto-resolve (barcode, then fuzzy name
   * match) against the destination outlet's catalogue. Only set when the
   * user has explicitly picked one — the picker is an override, not a
   * required field, since re-implementing the server's own matching here
   * client-side would just be a second, possibly-diverging copy of it. */
  destItemId: string;
}

export function emptyTransferLine(): DraftTransferLine {
  return { itemId: '', quantity: '', destItemId: '' };
}

const compactField = 'h-10 px-3 text-sm';

interface TransferLinesEditorProps {
  lines: DraftTransferLine[];
  onChange: (lines: DraftTransferLine[]) => void;
  sourceItems: ApiItem[];
  destItems: ApiItem[];
  destOutletChosen: boolean;
  disabled?: boolean;
}

/**
 * FR-08's line editor. The destination item picker only appears once a
 * destination outlet is chosen (there is nothing to pick from before that),
 * and defaults to "let the system match it" — the server resolves it by
 * barcode, then fuzzy name match, against the destination outlet's
 * catalogue, and rejects the whole request naming the item if it cannot.
 * Picking one here overrides that resolution outright.
 */
export function TransferLinesEditor({
  lines,
  onChange,
  sourceItems,
  destItems,
  destOutletChosen,
  disabled,
}: TransferLinesEditorProps) {
  const { t } = useTranslation();

  function update(index: number, patch: Partial<DraftTransferLine>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.length === 0 && <p className="text-sm text-foreground-muted">{t('transfers.builder.noLines')}</p>}

      {lines.map((line, index) => (
        <div
          key={index}
          className={`grid items-start gap-2 ${
            destOutletChosen ? 'grid-cols-[2fr_1fr_2fr_auto]' : 'grid-cols-[2fr_1fr_auto]'
          }`}
        >
          <Select
            aria-label={t('transfers.builder.itemFor', { line: index + 1 })}
            className={compactField}
            value={line.itemId}
            disabled={disabled}
            onChange={(e) => update(index, { itemId: e.target.value })}
          >
            <option value="">{t('transfers.builder.selectItem')}</option>
            {sourceItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.currentStock})
              </option>
            ))}
          </Select>

          <Input
            aria-label={t('transfers.builder.quantityFor', { line: index + 1 })}
            className={compactField}
            inputMode="decimal"
            placeholder="0.000"
            value={line.quantity}
            disabled={disabled}
            onChange={(e) => update(index, { quantity: e.target.value })}
          />

          {destOutletChosen && (
            <Select
              aria-label={t('transfers.builder.destItemFor', { line: index + 1 })}
              className={compactField}
              value={line.destItemId}
              disabled={disabled}
              onChange={(e) => update(index, { destItemId: e.target.value })}
            >
              <option value="">{t('transfers.builder.autoDetect')}</option>
              {destItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          )}

          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 p-0"
            aria-label={t('transfers.builder.removeLine', { line: index + 1 })}
            disabled={disabled}
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onChange([...lines, emptyTransferLine()])}
        >
          {t('transfers.builder.addLine')}
        </Button>
      </div>
    </div>
  );
}
