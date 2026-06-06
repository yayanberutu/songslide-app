--
-- PostgreSQL database dump
--

\restrict hVObZ2FjEmS2zb9ssge3Nw4bZf1A5rFhylsOMwSnqEsydvIRPfiCMsYYCo2UVbf

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: song_books; Type: TABLE DATA; Schema: public; Owner: songslide
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.song_books DISABLE TRIGGER ALL;

INSERT INTO public.song_books (id, code, name, description, display_order, active, created_at, updated_at) VALUES ('09cb1689-abdc-4030-8bff-606e9841869a', 'BE', 'Buku Ende', 'Buku Ende song book', 1, true, '2026-05-24 09:52:04.934211+00', '2026-05-24 09:52:04.934211+00');
INSERT INTO public.song_books (id, code, name, description, display_order, active, created_at, updated_at) VALUES ('91885a1b-454c-4a37-96e7-5ec2df1d9edb', 'KJ', 'Kidung Jemaat', 'Kidung Jemaat song book', 2, true, '2026-05-24 09:52:04.934211+00', '2026-05-24 09:52:04.934211+00');
INSERT INTO public.song_books (id, code, name, description, display_order, active, created_at, updated_at) VALUES ('b31eafcd-1201-41f0-a838-4b8a015420dd', 'PKJ', 'Pelengkap Kidung Jemaat', 'Pelengkap Kidung Jemaat song book', 3, true, '2026-05-24 09:52:04.934211+00', '2026-05-24 09:52:04.934211+00');
INSERT INTO public.song_books (id, code, name, description, display_order, active, created_at, updated_at) VALUES ('d7156f9a-10d9-4c01-b8fd-25d1ccb111e0', 'BNH', 'Buku Nyanyian HKBP', 'Buku Nyanyian HKBP song book', 4, true, '2026-05-24 09:52:04.934211+00', '2026-05-24 09:52:04.934211+00');
INSERT INTO public.song_books (id, code, name, description, display_order, active, created_at, updated_at) VALUES ('299a3ef1-e7f8-4e83-b1d7-bab62d3de6f6', 'NKB', 'Nyanyikanlah Kidung Baru', 'Nyanyikanlah Kidung Baru song book', 5, true, '2026-05-24 09:52:04.934211+00', '2026-05-24 09:52:04.934211+00');


ALTER TABLE public.song_books ENABLE TRIGGER ALL;

--
-- Data for Name: songs; Type: TABLE DATA; Schema: public; Owner: songslide
--

ALTER TABLE public.songs DISABLE TRIGGER ALL;

INSERT INTO public.songs (id, song_book_id, song_number, title, key_signature, time_signature, tempo_bpm, author, notes, metadata_json, created_at, updated_at) VALUES ('420c452b-20df-4880-b7ab-45f08239dc01', '91885a1b-454c-4a37-96e7-5ec2df1d9edb', '4', 'Hai Mari Sembah', 'G', '3/4', NULL, NULL, NULL, NULL, '2026-05-25 16:52:45.233177+00', '2026-05-25 16:52:45.233177+00');
INSERT INTO public.songs (id, song_book_id, song_number, title, key_signature, time_signature, tempo_bpm, author, notes, metadata_json, created_at, updated_at) VALUES ('e351f96d-2452-4e5a-923c-5ba2060e6e2b', '09cb1689-abdc-4030-8bff-606e9841869a', '112', 'O Tondi Parbadia i, bongoti', 'Es', '4/4', NULL, NULL, NULL, NULL, '2026-05-27 17:18:01.722328+00', '2026-05-27 17:18:01.722328+00');


ALTER TABLE public.songs ENABLE TRIGGER ALL;

--
-- Data for Name: song_arrangements; Type: TABLE DATA; Schema: public; Owner: songslide
--

ALTER TABLE public.song_arrangements DISABLE TRIGGER ALL;

INSERT INTO public.song_arrangements (id, song_id, name, is_default, content_json, layout_json, created_at, updated_at) VALUES ('69a168f0-b491-4410-a9f3-1546cb706ca0', '420c452b-20df-4880-b7ab-45f08239dc01', 'Default', true, '{"sections": [{"id": "verse", "type": "VERSE", "label": "Ayat", "lines": [{"notation": "5, | 1 1 2 | 3 . 1 | 4 4 3 | 2 .  ", "lineOrder": 1, "lyricsByVerse": {"1": "Hai ma ri sem bah Yang Ma ha be sar ", "2": "Hai mah syur kan lah ke a gu ngan Nya", "3": "Bu a na pe nuh mu ji zat a jaib"}}, {"notation": "5, | 1 1 2 | 3 . 4 | ([5 [. 4]] ) 3 2 | 1 . ", "lineOrder": 2, "lyricsByVerse": {"1": "nya nyi kan syu kur de ngan ber ge mar", "2": "ca ha ya te rang i tu ju bah Nya", "3": "ya Kha lik Eng kau mem bu at nya baik"}}, {"notation": "5, | 5, 5, 6, | 7, 7, 1 | 2 2 3 | 4 . ", "lineOrder": 3, "lyricsByVerse": {"1": "Pe ri sai u mat Nya Yang Ma ha e sa", "2": "Ge mu ruh sua ra Nya di a wan ke lam", "3": "Eng kau me mi sah kan da ra tan dan laut"}}, {"notation": "5,  | 1 1 2 | 3 3 4 | ([5 [. 4]]) 3 2 | 1 . . ||", "lineOrder": 4, "lyricsByVerse": {"1": "mu li a na ma Nya takh ta Nya me gah", "2": "ber ja lan lah Di a di ba dai ken cang", "3": "de ngan kua sa fir man be sar lah Eng kau"}}], "repeatable": true}, {"id": "verse-2", "type": "VERSE", "label": "Ayat", "lines": [], "repeatable": true}], "structureVersion": "1.0"}', '{}', '2026-05-25 16:52:52.092896+00', '2026-05-27 03:55:50.841079+00');
INSERT INTO public.song_arrangements (id, song_id, name, is_default, content_json, layout_json, created_at, updated_at) VALUES ('8967d728-1e47-4a32-8e52-b0317d01eecc', 'e351f96d-2452-4e5a-923c-5ba2060e6e2b', 'Default', true, '{"sections": [{"id": "verse", "type": "VERSE", "label": "Ayat", "lines": [{"notation": "1 | 5 3 1 5 | 6 6 5 5 | 6 7 1'' 7 | 6 6 5 3 | 6 5 4 3 | 2 . 1", "lineOrder": 1, "lyricsByVerse": {"1": "Ha le lu ya! Ta pu ji ma A man ta Tu han De ba ta di baen deng gan ba sa Na", "2": "Ha le lu ya Di Je sus i ta le hon ha sa nga pon i Nang pe pu ji pu ji an", "3": "Ha le lu ya Di Ton di I na sa ngap na ba di a i ta dok ma u li a te", "4": "Ha le lu ya Lam gan da ma bi ar ta mi da De ba ta nang ho long ni ro han ta"}}, {"notation": "1 | 5 3 1 5 | 6 6 5 5 | 6 7 1'' 7 | 6 6 5 3 | 6 5 4 3 | 2 . 1", "lineOrder": 2, "lyricsByVerse": {"1": "Sai tong gir gir ma hi ta be pa sa ngap De ba tan ta i di baen a si ro ha Na", "2": "Di le hon do mu dar Na i ma mu ri hi ta sa su de pa ra de ha ti go ran", "3": "Aut u nang saor I ba na tu ro han ta na so dung to gu lu hut na do man da te", "4": "I ma man das das hi ta on pa sa ngap De ba ta tong tong mar hi te pa ra ngen ta"}}, {"notation": "0 5 . 3 | 5 . 3 . | 4 3 2 3 | 4 3 2 3 | 4 3 2 . | 1 . 1'' 7 | 6 5 4 3 | 2 . 1 ||", "lineOrder": 3, "lyricsByVerse": {"1": "Sa ngap sa ngap Ha go go on Ha to gu on ha pis ta ran Di A man ta na di gin jang ", "2": "Deng gan deng gan par sao ran ta tu Tu han ta ba di a Na Song gop do tu hu ri a Na", "3": "Tu a tu a ma jam bar ta ba he non Na sa le leng na Di a do pan ni De ba ta", "4": "Pu ji pu ji to lu ha li ta u la hi mang gan da hon tu I ba na ha sa nga pon"}}], "repeatable": true}], "structureVersion": "1.0"}', '{}', '2026-05-27 17:18:05.433095+00', '2026-05-27 17:32:28.717966+00');


ALTER TABLE public.song_arrangements ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict hVObZ2FjEmS2zb9ssge3Nw4bZf1A5rFhylsOMwSnqEsydvIRPfiCMsYYCo2UVbf

