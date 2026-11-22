import { useNavigate } from 'react-router-dom';

/**
 * TEMPLATE — replace the [brackets] with your details and have it checked before publishing.
 */
function PrivacyPolicy() {
    const navigate = useNavigate();
    const language = localStorage.getItem('language') || 'en';
    const isArabic = language === 'ar';

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '760px', position: 'relative', zIndex: 1 }}>
                <div className="glass-card" dir={isArabic ? 'rtl' : 'ltr'} style={{ lineHeight: 1.8 }}>
                    {isArabic ? (
                        <>
                            <h2>سياسة الخصوصية</h2>
                            <p>آخر تحديث: [التاريخ]</p>
                            <p>تطبيق «قصة» يقدّمه [اسمك أو اسم شركتك]، [المدينة، الدولة].</p>
                            <h3>ما نجمعه</h3>
                            <p>اسم الطفل الأول فقط، لوضعه في القصة. يُحفظ الاسم على جهازك، ويُرسل إلى خادمنا فقط لصناعة التسجيل الصوتي للقصة.</p>
                            <p>نستخدم تسجيل دخول مجهول من Firebase لمنع إساءة الاستخدام. لا نطلب بريدًا إلكترونيًا أو رقم هاتف أو صورًا من الأطفال.</p>
                            <h3>كيف نستخدمه</h3>
                            <p>لصناعة القصة والتسجيل الصوتي فقط. التسجيلات تُحفظ على Google Firebase لتشغيلها مرة أخرى بسرعة. لا نبيع أي بيانات ولا نعرض إعلانات موجّهة.</p>
                            <h3>خدمات خارجية</h3>
                            <p>Google Firebase (الاستضافة وقاعدة البيانات والتخزين) وخدمة تحويل النص إلى كلام من Google.</p>
                            <h3>حقوقك</h3>
                            <p>لحذف أي تسجيل يحمل اسم طفلك، راسلنا على [البريد الإلكتروني].</p>
                        </>
                    ) : (
                        <>
                            <h2>Privacy Policy</h2>
                            <p>Last updated: [date]</p>
                            <p>Kessa is provided by [your name or company], [city, country].</p>
                            <h3>What we collect</h3>
                            <p>Only the child's first name, so it can appear in the story. The name is stored on your device, and sent to our server only to create the story's audio.</p>
                            <p>We use anonymous Firebase sign-in to prevent misuse. We do not ask children for an email, phone number or photos.</p>
                            <h3>How we use it</h3>
                            <p>Only to create the story and its audio. Recordings are stored on Google Firebase so they play quickly next time. We do not sell data or show targeted ads.</p>
                            <h3>Third-party services</h3>
                            <p>Google Firebase (hosting, database, storage) and Google Cloud Text-to-Speech.</p>
                            <h3>Your rights</h3>
                            <p>To delete any recording with your child's name, email us at [email].</p>
                        </>
                    )}
                    <button className="btn btn-secondary mt-3" onClick={() => navigate(-1)}>
                        {isArabic ? 'رجوع' : 'Back'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PrivacyPolicy;
