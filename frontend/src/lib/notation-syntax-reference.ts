export type NotationCheatSheetItem = {
  token: string;
  name: string;
  example: string;
  description: string;
};

export const NOTATION_CHEAT_SHEET: readonly NotationCheatSheetItem[] = [
  {
    token: "1 - 7",
    name: "Nada (Degree)",
    example: "1 2 3",
    description: "Not angka 1 (do) sampai 7 (si) untuk nada dasar."
  },
  {
    token: "0",
    name: "Tanda Diam (Rest)",
    example: "0",
    description: "Tanda istirahat / jeda tanpa nada (0 slot lirik)."
  },
  {
    token: "' / ,",
    name: "Oktaf (Octave)",
    example: "1' (tinggi) / 5, (rendah)",
    description: "Tanda petik (') untuk oktaf tinggi (titik atas), koma (,) untuk oktaf rendah (titik bawah)."
  },
  {
    token: "# / b",
    name: "Aksidental (Accidental)",
    example: "#4 (kres) / b7 (mol)",
    description: "Kres (#) menaikkan nada setengah, mol (b) menurunkan nada setengah."
  },
  {
    token: ".",
    name: "Perpanjangan (Hold/Extension)",
    example: "1 . .",
    description: "Titik untuk menahan atau memperpanjang ketukan nada sebelumnya."
  },
  {
    token: "| / ||",
    name: "Garis Birama (Bar Line)",
    example: "| 1 2 3 4 | / ||",
    description: "Garis tegak (|) untuk pembatas birama, garis ganda (||) untuk akhir seksi/lagu."
  },
  {
    token: "[ ]",
    name: "Garis Bendera (Beam)",
    example: "[1 2]",
    description: "Mengelompokkan nada bernilai 1/2 ketuk atau lebih pendek di bawah garis bendera."
  },
  {
    token: "( )",
    name: "Garis Lengkung (Slur)",
    example: "(1 2)",
    description: "Melisma / beberapa nada dinyanyikan dalam satu suku kata lirik."
  },
  {
    token: "([ ])",
    name: "Kombinasi (Beam & Slur)",
    example: "([1 2 3])",
    description: "Kombinasi grup bendera dan lengkung slur (mis. [(1 2) 3])."
  },
  {
    token: "^",
    name: "Fermata",
    example: "1^ / 3'^ / 0^",
    description: "Tanda tahanan nada lebih lama, ditulis di akhir token notasi."
  }
];
