import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LandingRibbon } from './LandingRibbon';
import { FairShareIcon } from '../../components/ui/Icons';
import { TopNav } from '../../components/layout/TopNav';
import { ToastContainer } from '../../components/ui/Toast';

const CHAPTERS = [
  { name: 'Mở đầu' },
  { name: 'Lợi ích' },
  { name: 'Dashboard' },
  { name: 'Màn hình' },
  { name: 'Cách dùng' },
  { name: 'Dành cho ai' },
];

export const LandingPage: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!storyRef.current) return;
      const r = storyRef.current.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const s = Math.min(1, Math.max(0, -r.top / total));
      setScrollProgress(s);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToChapter = (index: number) => {
    if (!storyRef.current) return;
    const r = storyRef.current.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const targetY = window.scrollY + r.top + (total * (index + 0.5)) / CHAPTERS.length + 1;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const raw = scrollProgress * CHAPTERS.length;
  const currentChapterIdx = Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(raw)));

  const getChapStyle = (idx: number): React.CSSProperties => {
    let u = raw - (idx + 0.5);
    if (idx === 0 && u < 0) u = 0;
    if (idx === CHAPTERS.length - 1 && u > 0) u = 0;
    const dist = Math.abs(u);
    const a = Math.max(0, Math.min(1, 1 - (dist - 0.3) / 0.2));
    return {
      opacity: a,
      visibility: a < 0.01 ? 'hidden' : 'visible',
      pointerEvents: a > 0.6 ? 'auto' : 'none',
      transform: a >= 0.999 ? 'none' : `translateY(${(-u * 34).toFixed(1)}px)`,
      filter: a >= 0.999 ? 'none' : `blur(${((1 - a) * 6).toFixed(1)}px)`,
    };
  };

  return (
    <div className="landing-wrapper">
      <TopNav />

      <main id="main">
        <section className="view" id="v-home">
          <div className="story" id="story" ref={storyRef}>
            <div className="lstage" id="lstage">
              <LandingRibbon scrollProgress={scrollProgress} />

              {/* Chapter 0: Mở đầu */}
              <div className="chap lead" style={getChapStyle(0)}>
                <span className="eyebrow">Dành cho đồ án nhóm</span>
                <h1 className="h-xl">
                  Chia điểm <em className="it">công bằng</em>, dựa trên bằng chứng.
                </h1>
                <p className="hero-side">
                  FairShare tự ghi nhận ai làm gì, bao nhiêu, khi nào, từ Trello và Google Docs.
                </p>
                <div className="btns">
                  <Link className="btn" to="/dashboard">
                    Xem Dashboard
                  </Link>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => scrollToChapter(1)}
                  >
                    Tìm hiểu thêm
                  </button>
                </div>
              </div>

              {/* Chapter 1: Lợi ích */}
              <div className="chap" style={getChapStyle(1)}>
                <span className="eyebrow">Lợi ích chính</span>
                <h2 className="h-l">
                  Mọi đóng góp đều có <em className="it">dấu vết</em>
                </h2>
                <div className="cards c4">
                  <div className="glass fcard">
                    <span className="ico">
                      <FairShareIcon name="plug" />
                    </span>
                    <h3>Tích hợp tự động</h3>
                    <p>Nối Trello và Google Docs, task hoàn thành và chỉnh sửa tài liệu tự được ghi lại.</p>
                  </div>
                  <div className="glass fcard">
                    <span className="ico">
                      <FairShareIcon name="chart" />
                    </span>
                    <h3>Bảng đóng góp</h3>
                    <p>Biểu đồ tỷ lệ từng người, mở ra thấy ai làm gì và lúc nào.</p>
                  </div>
                  <div className="glass fcard">
                    <span className="ico">
                      <FairShareIcon name="vote" />
                    </span>
                    <h3>Chấm chéo ẩn danh</h3>
                    <p>Cuối mỗi sprint, thành viên đánh giá nhau theo chất lượng, đúng hạn, hợp tác.</p>
                  </div>
                  <div className="glass fcard">
                    <span className="ico">
                      <FairShareIcon name="bell" />
                    </span>
                    <h3>Cảnh báo sớm</h3>
                    <p>Nhắc nhóm khi có người không hoạt động trong thời gian dài.</p>
                  </div>
                </div>
              </div>

              {/* Chapter 2: Dashboard Mockup */}
              <div className="chap" style={getChapStyle(2)}>
                <span className="eyebrow">Một nơi cho tất cả</span>
                <h2 className="h-l">
                  Một bảng cho <em className="it">mọi đóng góp</em>
                </h2>
                <p className="sub">
                  Dữ liệu từ Trello, Google Docs và phiếu chấm chéo gom về một Dashboard, sẵn sàng xuất PDF cho giảng viên.
                </p>
                <div className="glass mock">
                  <div className="mock-bar">
                    <i />
                    <i />
                    <i />
                    <span>fairshare / dashboard · sprint 3</span>
                  </div>
                  <div className="mock-body">
                    <div className="st">
                      <div className="k">Task xong</div>
                      <div className="v">
                        88<small style={{ font: '400 12px var(--f-body)', color: 'var(--fg3)' }}> / 112</small>
                      </div>
                      <div className="k">Chỉnh sửa Docs</div>
                      <div className="v" style={{ marginBottom: 0 }}>
                        1.248
                      </div>
                    </div>
                    <div className="donut" id="mockDonut">
                      <svg viewBox="0 0 100 100" width="150" height="150" aria-hidden="true">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m1)" strokeWidth="14" strokeDasharray="82.4 168.9" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m2)" strokeWidth="14" strokeDasharray="64.8 186.5" strokeDashoffset="-85.4" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m3)" strokeWidth="14" strokeDasharray="57.3 194.0" strokeDashoffset="-153.2" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m4)" strokeWidth="14" strokeDasharray="34.7 216.6" strokeDashoffset="-213.5" transform="rotate(-90 50 50)" />
                      </svg>
                      <b>4</b>
                    </div>
                    <div className="mock-bars" id="mockBars">
                      <div>
                        <span>Minh Triều</span>
                        <span className="b" style={{ '--c': 'var(--m1)' } as React.CSSProperties}>
                          <i style={{ width: '85%' }} />
                        </span>
                        <em>34%</em>
                      </div>
                      <div>
                        <span>Lan Anh</span>
                        <span className="b" style={{ '--c': 'var(--m2)' } as React.CSSProperties}>
                          <i style={{ width: '67.5%' }} />
                        </span>
                        <em>27%</em>
                      </div>
                      <div>
                        <span>Quốc Bảo</span>
                        <span className="b" style={{ '--c': 'var(--m3)' } as React.CSSProperties}>
                          <i style={{ width: '60%' }} />
                        </span>
                        <em>24%</em>
                      </div>
                      <div>
                        <span>Thu Hà</span>
                        <span className="b" style={{ '--c': 'var(--m4)' } as React.CSSProperties}>
                          <i style={{ width: '37.5%' }} />
                        </span>
                        <em>15%</em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapter 3: Màn hình */}
              <div className="chap" style={getChapStyle(3)}>
                <span className="eyebrow">Nhìn gần hơn</span>
                <h2 className="h-l">
                  Bốn màn hình bạn sẽ <em className="it">dùng nhiều nhất</em>
                </h2>
                <div className="cards c4">
                  <Link className="glass fcard" to="/dashboard">
                    <div className="viz">
                      <svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m1)" strokeWidth="14" strokeDasharray="82.4 168.9" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m2)" strokeWidth="14" strokeDasharray="64.8 186.5" strokeDashoffset="-85.4" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m3)" strokeWidth="14" strokeDasharray="57.3 194.0" strokeDashoffset="-153.2" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m4)" strokeWidth="14" strokeDasharray="34.7 216.6" strokeDashoffset="-213.5" transform="rotate(-90 50 50)" />
                      </svg>
                    </div>
                    <h3>Dashboard</h3>
                    <p>Tổng quan tỷ lệ đóng góp và hoạt động mới nhất.</p>
                  </Link>
                  <Link className="glass fcard" to="/dashboard">
                    <div className="viz">
                      <div className="bars">
                        <i style={{ '--c': 'var(--m1)', width: '85%' } as React.CSSProperties} />
                        <i style={{ '--c': 'var(--m2)', width: '67.5%' } as React.CSSProperties} />
                        <i style={{ '--c': 'var(--m3)', width: '60%' } as React.CSSProperties} />
                        <i style={{ '--c': 'var(--m4)', width: '37.5%' } as React.CSSProperties} />
                      </div>
                    </div>
                    <h3>Bảng đóng góp</h3>
                    <p>Chi tiết từng người, kèm bằng chứng truy vết.</p>
                  </Link>
                  <Link className="glass fcard" to="/peer-review">
                    <div className="viz">
                      <span className="stars">★★★★☆</span>
                    </div>
                    <h3>Chấm chéo</h3>
                    <p>Phiếu ẩn danh cuối mỗi sprint.</p>
                  </Link>
                  <Link className="glass fcard" to="/report">
                    <div className="viz">
                      <div className="tbl">
                        <i />
                        <i style={{ width: '80%' }} />
                        <i style={{ width: '90%' }} />
                        <i style={{ width: '60%' }} />
                      </div>
                    </div>
                    <h3>Báo cáo</h3>
                    <p>Bản PDF đóng góp để nộp giảng viên.</p>
                  </Link>
                </div>
              </div>

              {/* Chapter 4: Cách dùng */}
              <div className="chap" style={getChapStyle(4)}>
                <span className="eyebrow">Cách nhóm sử dụng</span>
                <h2 className="h-l">
                  Từ kết nối đến <em className="it">báo cáo</em>
                </h2>
                <p className="sub">Bốn bước, lặp lại mỗi sprint.</p>
                <div className="steps">
                  <div className="step">
                    <span className="n">01</span>
                    <h3>Kết nối</h3>
                    <p>Cấp quyền đọc cho bảng Trello và các tài liệu Google Docs của nhóm.</p>
                  </div>
                  <div className="step">
                    <span className="n">02</span>
                    <h3>Ghi nhận</h3>
                    <p>Hoạt động được lưu tự động, kèm thời điểm và người thực hiện.</p>
                  </div>
                  <div className="step">
                    <span className="n">03</span>
                    <h3>Chấm chéo</h3>
                    <p>Cuối sprint, mỗi người chấm đồng đội theo ba tiêu chí.</p>
                  </div>
                  <div className="step">
                    <span className="n">04</span>
                    <h3>Xuất báo cáo</h3>
                    <p>Tạo file PDF đóng góp để nhóm chia điểm và nộp giảng viên.</p>
                  </div>
                </div>
              </div>

              {/* Chapter 5: Dành cho ai */}
              <div className="chap" style={getChapStyle(5)}>
                <span className="eyebrow">Mỗi người một góc nhìn</span>
                <h2 className="h-l">
                  Ba vai trò, <em className="it">một sự thật</em>
                </h2>
                <div className="cards c3">
                  <div className="glass fcard">
                    <h3>Thành viên</h3>
                    <p>Thấy việc của mình được ghi nhận, không cần tự chứng minh.</p>
                  </div>
                  <div className="fcard hl glass">
                    <h3>Nhóm trưởng</h3>
                    <p>Có số liệu để chia điểm và nhắc người im lặng, không phải tranh luận cảm tính.</p>
                    <Link className="btn sm" to="/dashboard">
                      Xem Dashboard
                    </Link>
                  </div>
                  <div className="glass fcard">
                    <h3>Giảng viên</h3>
                    <p>Nhận bản đóng góp có bằng chứng để tham khảo khi chấm điểm cá nhân.</p>
                  </div>
                </div>
              </div>

              {/* Side Chapter Indicators */}
              <div className="lpager" id="lpager" aria-label="Các chương">
                {CHAPTERS.map((chap, i) => (
                  <button
                    key={chap.name}
                    type="button"
                    className={i === currentChapterIdx ? 'on' : ''}
                    onClick={() => scrollToChapter(i)}
                    aria-label={chap.name}
                    title={chap.name}
                  />
                ))}
              </div>

              {/* Scroll down indicator */}
              <div
                className="cue"
                id="lcue"
                style={{ opacity: Math.max(0, 1 - scrollProgress / 0.05) }}
              >
                <span>Cuộn xuống</span>
                <i />
              </div>
            </div>
          </div>

          {/* FAQ Band */}
          <section className="band" id="faq">
            <div className="wrapn">
              <span className="eyebrow">Câu hỏi thường gặp</span>
              <h2>
                Còn <em className="it">thắc mắc</em>?
              </h2>
              <details className="q" open>
                <summary>Dữ liệu của nhóm có bị người ngoài xem không?</summary>
                <p>
                  FairShare được thiết kế để chỉ thành viên nhóm và giảng viên được cấp quyền mới xem được. Điểm
                  chấm chéo được tổng hợp trước khi hiển thị nên không lộ ai đã chấm ai.
                </p>
              </details>
              <details className="q">
                <summary>Làm sao biết số liệu không bị làm giả?</summary>
                <p>
                  Mỗi ghi nhận lấy từ lịch sử của Trello và Google Docs, kèm thời điểm. Những lần chỉnh sửa hàng
                  loạt sát hạn chót sẽ được đánh dấu để nhóm xem lại.
                </p>
              </details>
              <details className="q">
                <summary>Cần chuẩn bị gì để bắt đầu?</summary>
                <p>
                  Một bảng Trello và các tài liệu Google Docs của nhóm. Bạn chỉ cần cấp quyền đọc, không phải nhập
                  tay.
                </p>
              </details>
              <details className="q">
                <summary>Chấm chéo ẩn danh hoạt động thế nào?</summary>
                <p>
                  Cuối mỗi sprint, mỗi thành viên chấm các bạn còn lại theo chất lượng, đúng hạn và tinh thần hợp
                  tác. Người được chấm chỉ thấy điểm trung bình.
                </p>
              </details>
              <details className="q">
                <summary>Giảng viên dùng báo cáo như thế nào?</summary>
                <p>
                  Báo cáo PDF cho thấy tỷ lệ đóng góp và bằng chứng của từng người. Giảng viên dùng để tham khảo,
                  quyết định điểm vẫn thuộc về giảng viên.
                </p>
              </details>
            </div>
          </section>

          {/* CTA Section */}
          <section className="cta">
            <div className="cta-box">
              <span className="eyebrow">Bắt đầu</span>
              <h2 className="h-l" style={{ fontWeight: 300 }}>
                Thử với <em className="it">nhóm của bạn</em>
              </h2>
              <p className="sub">Xem giao diện mẫu của FairShare với dữ liệu giả lập.</p>
              <div className="btns" style={{ justifyContent: 'center' }}>
                <Link className="btn" to="/dashboard">
                  Xem Dashboard
                </Link>
                <Link className="btn ghost" to="/report">
                  Xem báo cáo mẫu
                </Link>
              </div>
            </div>
            <div className="pills">
              <span>Minh bạch</span>
              <span>Công bằng</span>
              <span>Bằng chứng</span>
              <span>Truy vết</span>
              <span>Đồng đội</span>
              <span>Sprint</span>
              <span>Báo cáo</span>
            </div>
            <div className="foot">
              <span>© FairShare · Đồ án môn Quản lý dự án CNTT</span>
              <span>Giao diện mẫu, dữ liệu giả lập</span>
            </div>
          </section>
        </section>
      </main>

      <ToastContainer />
    </div>
  );
};
