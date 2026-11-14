import { Button, Icon, Sheet, Tag } from '@cde/ui';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  brl,
  CATEGORY_LABEL,
  discountPct,
  type Product,
  type ProductCategory,
  priceHistory,
  storeOf,
} from '../lib/catalog';
import { useWishlist, wishStatus } from '../lib/wishlist';

const CATEGORY_BG: Record<ProductCategory, string> = {
  tenis: 'bg-secondary text-on-secondary',
  roupa: 'bg-accent text-on-accent',
  bolsa: 'bg-gold text-on-gold',
  joia: 'bg-paper text-on-paper',
  brinquedo: 'bg-primary text-on-primary',
  cinema: 'bg-primary text-on-primary',
  livro: 'bg-surface-2 text-ink',
};

/**
 * Foto `n` do produto em public/produtos/<id>-<n>.webp. Sem a foto 1, um bloco com a categoria;
 * sem a foto 2, avisa `onMissing` e não mostra nada.
 */
export function ProductArt({
  product,
  n = 1,
  onMissing,
  className,
}: {
  product: Product;
  n?: 1 | 2;
  onMissing?: () => void;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed && n === 2) return null;
  if (failed) {
    return (
      <div
        className={`grid place-items-center ${CATEGORY_BG[product.category]} ${className ?? ''}`}
        aria-hidden
      >
        <span className="font-display text-2xl font-extrabold">
          {CATEGORY_LABEL[product.category]}
        </span>
      </div>
    );
  }
  return (
    <img
      src={`/produtos/${product.id}-${n}.webp`}
      alt=""
      loading="lazy"
      onError={() => {
        setFailed(true);
        onMissing?.();
      }}
      className={`object-cover ${className ?? ''}`}
    />
  );
}

/** Duas fotos do produto: desliza com o dedo; com o mouse, troca ao passar por cima. */
export function ProductGallery({ product, className }: { product: Product; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasSecond, setHasSecond] = useState(true);
  const [shown, setShown] = useState(0);
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: troca de foto no hover é só enfeite; no toque, desliza
    <div
      className={`relative ${className ?? ''}`}
      onMouseEnter={() => hasSecond && go(1)}
      onMouseLeave={() => go(0)}
    >
      <div
        ref={ref}
        onScroll={(e) =>
          setShown(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
        }
        className="flex size-full snap-x snap-mandatory overflow-x-auto"
      >
        <ProductArt product={product} className="size-full shrink-0 snap-center" />
        {hasSecond && (
          <ProductArt
            product={product}
            n={2}
            onMissing={() => setHasSecond(false)}
            className="size-full shrink-0 snap-center"
          />
        )}
      </div>
      {hasSecond && (
        <span className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden>
          {[0, 1].map((i) => (
            <span
              key={i}
              className={`size-2 rounded-full border border-line ${shown === i ? 'bg-ink' : 'bg-surface'}`}
            />
          ))}
        </span>
      )}
    </div>
  );
}

function SaveButton({ product, onSave }: { product: Product; onSave: () => void }) {
  const { wishes, remove } = useWishlist();
  const saved = !!wishes[product.id];
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Tirar ${product.name} dos desejos` : `Salvar ${product.name}`}
      onClick={(e) => {
        e.stopPropagation();
        if (saved) remove(product.id);
        else onSave();
      }}
      className={`grid size-11 place-items-center rounded-full chunk-thin focus-ring ${
        saved ? 'bg-primary text-on-primary' : 'bg-surface text-ink'
      }`}
    >
      <Icon name={saved ? 'check' : 'plus'} size={20} />
    </button>
  );
}

/** Cartão da vitrine: foto, desconto, nome, loja e preço. Tocar abre os detalhes. */
export function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const { priceOf } = useWishlist();
  const price = priceOf(product);
  const off = discountPct(product, price);
  return (
    <div className="relative w-44 shrink-0 snap-start overflow-hidden rounded-lg bg-surface chunk shadow-hard">
      <button type="button" onClick={onOpen} className="block w-full text-left focus-ring">
        <ProductGallery product={product} className="aspect-square w-full" />
        <span className="block p-3">
          <span className="line-clamp-2 block font-semibold leading-tight">{product.name}</span>
          <span className="block text-xs text-ink-soft">{storeOf(product).name}</span>
          <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-lg font-extrabold">{brl(price)}</span>
            {product.oldPrice && product.oldPrice > price && (
              <s className="text-xs text-ink-soft">{brl(product.oldPrice)}</s>
            )}
          </span>
        </span>
      </button>
      {off && (
        <Tag tone="primary" className="absolute left-2 top-2">
          −{off}%
        </Tag>
      )}
      <div className="absolute right-2 top-2">
        <SaveButton product={product} onSave={onOpen} />
      </div>
    </div>
  );
}

/** Linha do preço nos últimos 30 dias, com o ponto de hoje destacado. */
function PriceLine({ values }: { values: number[] }) {
  const w = 280;
  const h = 64;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = (v: number) => (max === min ? h / 2 : 4 + ((max - v) / (max - min)) * (h - 8));
  const x = (i: number) => (i / (values.length - 1)) * w;
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values.at(-1) ?? 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-16 w-full"
      role="img"
      aria-label="Preço nos últimos 30 dias"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx={x(values.length - 1)} cy={y(last)} r="5" className="fill-primary" />
    </svg>
  );
}

/** Detalhes do produto: preço do mês, onde fica e "me avise quando baixar". */
export function ProductSheet({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { wishes, priceOf, save, remove } = useWishlist();
  if (!product) return <Sheet open={false} onClose={onClose} title="" />;

  const price = priceOf(product);
  const history = priceHistory(product, price);
  const lowest = Math.min(...history);
  const store = storeOf(product);
  const wish = wishes[product.id];
  const status = wish && wishStatus(wish, price);
  const targets = [0.9, 0.8, 0.7].map((f) => Math.floor(price * f) + 0.9);

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      description={`${store.name} · ${store.floor}`}
    >
      <ProductGallery
        product={product}
        className="aspect-[4/3] w-full overflow-hidden rounded-lg"
      />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold">{brl(price)}</span>
        {product.oldPrice && product.oldPrice > price && (
          <s className="text-sm text-ink-soft">{brl(product.oldPrice)}</s>
        )}
      </div>

      <div className="mt-3 rounded-md bg-surface-2 p-3">
        <p className="text-sm font-semibold">Últimos 30 dias</p>
        <PriceLine values={history} />
        <p className="text-xs text-ink-soft">Menor preço do mês: {brl(lowest)}</p>
      </div>

      {wish && status ? (
        <div className="mt-4 rounded-md bg-surface-2 p-3">
          <p className="font-semibold">
            {status.reached
              ? 'Chegou no seu preço! Corre que é por tempo limitado.'
              : `Aviso quando ficar abaixo de ${brl(wish.target)}.`}
          </p>
          {status.dropped > 0 && (
            <p className="text-sm text-success">
              Baixou {brl(status.dropped)} desde que você salvou.
            </p>
          )}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => remove(product.id)}>
            Tirar dos desejos
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="font-semibold">Salvar e me avisar quando ficar abaixo de:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {targets.map((t) => (
              <Button key={t} variant="secondary" size="sm" onClick={() => save(product, t)}>
                {brl(t)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button
        block
        icon="map"
        className="mt-4"
        onClick={() => navigate(`/mapa?loja=${product.storeId}`)}
      >
        Como chegar na {store.name}
      </Button>
    </Sheet>
  );
}
