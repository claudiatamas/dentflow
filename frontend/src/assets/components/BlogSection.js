import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const API_BASE = 'http://localhost:8000';

const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const BlogSection = () => {
  const [blogPosts, setBlogPosts]   = useState([]);
  const [sectionRef, inView]        = useInView();
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd]             = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res  = await fetch(`${API_BASE}/blogs-public?limit=20&offset=0`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBlogPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading blogs:', err);
        setBlogPosts([]);
      }
    };
    fetchBlogs();
  }, []);

  const onSwiper = useCallback((swiper) => {
    setSwiperInstance(swiper);
    swiper.on('slideChange', () => {
      setIsBeginning(swiper.isBeginning);
      setIsEnd(swiper.isEnd);
    });
  }, []);

  const prev = () => swiperInstance?.slidePrev();
  const next = () => swiperInstance?.slideNext();

  return (
    <section id="blog" ref={sectionRef} className="py-20 md:py-28 bg-white px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header row: title left, arrows right */}
        <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div>
          
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-3">
              From Our Blog
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-lg">
              Stay informed and empowered with the latest insights in dental care.
            </p>
          </div>

          {/* Nav buttons — top right, never overlap cards */}
          <div className="flex items-center gap-2 flex-shrink-0 pb-1">
            <button
              onClick={prev}
              disabled={isBeginning}
              className="cursor-pointer w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#369cf7] hover:text-[#369cf7] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <FaChevronLeft size={13} />
            </button>
            <button
              onClick={next}
              disabled={isEnd}
              className="cursor-pointer w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#369cf7] hover:text-[#369cf7] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <FaChevronRight size={13} />
            </button>
           
          </div>
        </div>

        {/* Swiper — no built-in navigation/pagination */}
        <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {blogPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-lg">No articles yet.</p>
            </div>
          ) : (
            <Swiper
              onSwiper={onSwiper}
              spaceBetween={24}
              slidesPerView={1}
              breakpoints={{
                768:  { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
            >
              {blogPosts.map((post) => {
                const href     = post.post_type === 'external' ? post.external_link : `/blog/${post.id}`;
                const external = post.post_type === 'external';
                const date     = formatDate(post.published_at || post.created_at);

                return (
                  <SwiperSlide key={post.id} className="pb-2">
                    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-transparent transition-all duration-300 flex flex-col h-full">

                      {/* Image */}
                      <div className="relative overflow-hidden h-48 flex-shrink-0">
                        <img
                          src={post.featured_image_url || '/images/default-blog.jpg'}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {date && (
                          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-600 px-3 py-1 rounded-full shadow-sm">
                            {date}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-base font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-[#369cf7] transition-colors duration-200">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed flex-1">
                          {post.short_description}
                        </p>
                        <a
                          href={href}
                          target={external ? '_blank' : '_self'}
                          rel={external ? 'noopener noreferrer' : undefined}
                          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#369cf7] hover:gap-3 transition-all duration-200"
                        >
                          Read more <span className="text-base">→</span>
                        </a>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          )}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;