import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getStoryById,
    replaceHeroName,
    getStoryTitle,
    getStoryContent,
    getContentLanguage,
    hasFreeStoriesConfigured,
    isStoryOpen,
    getChildGender
} from '../services/storyService';
import { getColoringScenes, coloringUrl } from '../data/coloringPages';
import { cleanStoryText } from '../utils/textCleaner';

/**
 * Share paragraphs out over `pageCount` pages so each page has a similar amount of text.
 */
function splitIntoPages(paragraphs, pageCount) {
    if (pageCount <= 1) return [paragraphs];
    const total = paragraphs.reduce((sum, p) => sum + p.length, 0);
    const target = total / pageCount;
    const pages = [];
    let current = [];
    let size = 0;

    paragraphs.forEach((paragraph, index) => {
        current.push(paragraph);
        size += paragraph.length;
        const remainingParagraphs = paragraphs.length - index - 1;
        const remainingPages = pageCount - pages.length - 1;
        // Close this page when it has enough text, or when every later page needs one paragraph
        if (remainingPages > 0 && (size >= target || remainingParagraphs <= remainingPages)) {
            pages.push(current);
            current = [];
            size = 0;
        }
    });
    if (current.length) pages.push(current);
    while (pages.length < pageCount) pages.push([]); // more pictures than paragraphs
    return pages;
}

const PRINT_CSS = `
.print-book { background: #fff; color: #2b2b2b; min-height: 100vh; font-family: Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif; }
.print-toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 0.75rem; justify-content: center; padding: 1rem; background: #f4f0fb; border-bottom: 1px solid #e2d9f3; }
.print-toolbar button { font-size: 1rem; padding: 0.7rem 1.4rem; border-radius: 999px; border: none; cursor: pointer; }
.print-toolbar .primary { background: #7c4dff; color: #fff; }
.print-toolbar .secondary { background: #fff; color: #5a3fc0; border: 1px solid #c9b8f5; }
.print-hint { text-align: center; font-size: 0.85rem; color: #6b6b6b; padding: 0.5rem 1rem 0; }
.print-page { max-width: 190mm; margin: 1.5rem auto; padding: 14mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-radius: 6px; min-height: 250mm; display: flex; flex-direction: column; }
.print-cover { justify-content: center; align-items: center; text-align: center; }
.print-cover h1 { font-size: 2.4rem; color: #5a3fc0; margin: 1.5rem 0 0.75rem; }
.print-cover .for { font-size: 1.4rem; color: #444; }
.print-cover img { max-width: 100%; max-height: 150mm; object-fit: contain; border-radius: 10px; }
.print-page .illustration { width: 100%; max-height: 130mm; object-fit: contain; border-radius: 8px; margin-bottom: 8mm; }
.print-page p { font-size: 15pt; line-height: 1.7; margin: 0 0 4mm; }
.print-page .page-number { margin-top: auto; text-align: center; font-size: 10pt; color: #999; }
.print-end { justify-content: center; align-items: center; font-size: 2rem; color: #5a3fc0; }
.print-end img { width: 100%; max-height: 150mm; object-fit: contain; margin-bottom: 8mm; }
.print-cover .coloring-hint { font-size: 1.1rem; color: #666; margin-top: 1rem; }
.print-page .illustration.coloring { border: none; }
@media print {
  @page { size: A4; margin: 0; }
  html, body, #root { background: #fff !important; }
  .stars, .moon, .no-print { display: none !important; }
  .print-page { box-shadow: none; margin: 0 auto; border-radius: 0; min-height: 297mm; max-width: none; width: 210mm; page-break-after: always; break-after: page; }
  .print-page:last-child { page-break-after: auto; break-after: auto; }
}
`;

function PrintableStory({ childName }) {
    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const { storyId } = useParams();
    const navigate = useNavigate();
    const uiLanguage = localStorage.getItem('language') || 'en';

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }
        Promise.all([getStoryById(storyId), hasFreeStoriesConfigured()]).then(([data, freeConfigured]) => {
            if (data && !isStoryOpen(data, freeConfigured)) {
                navigate('/stories');
                return;
            }
            setStory(data);
            setLoading(false);
        });
    }, [storyId, childName, navigate]);

    if (loading) {
        return <div className="page"><div className="loading"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div></div>;
    }
    if (!story) {
        return <div className="page"><div className="glass-card text-center"><h3>Story not found</h3></div></div>;
    }

    const language = getContentLanguage(story, uiLanguage);
    const isArabic = language === 'ar';
    const title = replaceHeroName(getStoryTitle(story, language), childName);
    const text = replaceHeroName(cleanStoryText(getStoryContent(story, language)), childName);
    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    const uploaded = story.illustrations || [];
    const pageCount = uploaded.length || Math.max(1, Math.ceil(paragraphs.length / 3));
    const pages = splitIntoPages(paragraphs, pageCount);

    // No pictures uploaded in admin → coloring pages (the child in them matches boy/girl)
    const gender = getChildGender();
    const useColoring = uploaded.length === 0;
    const [firstScene, secondScene] = getColoringScenes(story.id || storyId);
    const illustrations = useColoring ? [] : uploaded;
    if (useColoring) {
        illustrations[0] = coloringUrl(firstScene, gender);
        if (pages.length > 2) illustrations[Math.floor(pages.length / 2)] = coloringUrl(secondScene, gender);
    }
    const coverImage = story.thumbnailUrl || (useColoring ? coloringUrl('cover', gender) : '');

    return (
        <div className="print-book" dir={isArabic ? 'rtl' : 'ltr'} lang={language}>
            <style>{PRINT_CSS}</style>

            <div className="print-toolbar no-print">
                <button className="secondary" onClick={() => navigate(`/play/${storyId}`)}>
                    {isArabic ? '→ رجوع' : '← Back'}
                </button>
                <button className="primary" onClick={() => window.print()}>
                    {isArabic ? '🖨️ طباعة / حفظ PDF' : '🖨️ Print / Save as PDF'}
                </button>
            </div>
            <p className="print-hint no-print">
                {isArabic
                    ? 'لحفظ الكتاب كملف PDF اختاري "حفظ كـ PDF" في نافذة الطباعة.'
                    : 'To save the book as a PDF, choose "Save as PDF" in the print window.'}
            </p>

            {/* Cover */}
            <section className="print-page print-cover">
                {coverImage && <img src={coverImage} alt="" />}
                <h1>{title}</h1>
                <p className="for">
                    {isArabic ? `قصة خاصة بـ ${childName} ⭐` : `A special story for ${childName} ⭐`}
                </p>
                {useColoring && (
                    <p className="coloring-hint">
                        {isArabic ? (gender === 'girl' ? '🖍️ لوّني الصور بألوانكِ المفضّلة!' : '🖍️ لوّن الصور بألوانك المفضّلة!') : '🖍️ Color the pictures with your favorite colors!'}
                    </p>
                )}
            </section>

            {/* Story pages */}
            {pages.map((pageParagraphs, index) => (
                <section className="print-page" key={index}>
                    {illustrations[index] && <img className={`illustration${useColoring ? ' coloring' : ''}`} src={illustrations[index]} alt="" />}
                    {pageParagraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
                    <div className="page-number">{index + 1}</div>
                </section>
            ))}

            <section className="print-page print-end">
                {useColoring && <img src={coloringUrl('night', gender)} alt="" />}
                {isArabic ? '🌙 النهاية' : '🌙 The End'}
            </section>
        </div>
    );
}

export default PrintableStory;
